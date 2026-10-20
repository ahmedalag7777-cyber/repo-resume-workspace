-- Phase I: autonomous governance and business-intelligence evidence.
CREATE TABLE IF NOT EXISTS governance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  policy_key text NOT NULL, version integer NOT NULL DEFAULT 1, status text NOT NULL CHECK (status IN ('draft','active','retired','blocked')),
  priority integer NOT NULL DEFAULT 100, rules jsonb NOT NULL DEFAULT '{}'::jsonb, effective_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, UNIQUE(company_id, policy_key, version)
);
CREATE INDEX IF NOT EXISTS idx_governance_policy_active ON governance_policies(company_id, status, priority, effective_at DESC);

CREATE TABLE IF NOT EXISTS business_intelligence_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision_key text NOT NULL, policy_key text, decision_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('PROPOSED','APPROVED','EXECUTED','REJECTED','EXPIRED','BLOCKED')),
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1), expected_impact numeric,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), executed_at timestamptz,
  UNIQUE(company_id, decision_key)
);
CREATE INDEX IF NOT EXISTS idx_bi_decisions_operational ON business_intelligence_decisions(company_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS kpi_evidence_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kpi_key text NOT NULL, observed_at timestamptz NOT NULL DEFAULT now(), value numeric NOT NULL,
  baseline numeric, target numeric, variance numeric, quality text NOT NULL CHECK (quality IN ('verified','estimated','insufficient')),
  source_evidence jsonb NOT NULL DEFAULT '{}'::jsonb, UNIQUE(company_id, kpi_key, observed_at)
);
CREATE INDEX IF NOT EXISTS idx_kpi_evidence_latest ON kpi_evidence_snapshots(company_id, kpi_key, observed_at DESC);

CREATE TABLE IF NOT EXISTS governance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  alert_key text NOT NULL, severity text NOT NULL CHECK (severity IN ('info','warning','high','critical')),
  status text NOT NULL CHECK (status IN ('open','acknowledged','resolved','suppressed')) DEFAULT 'open',
  reason text NOT NULL, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz, UNIQUE(company_id, alert_key)
);
CREATE INDEX IF NOT EXISTS idx_governance_alerts_open ON governance_alerts(company_id, status, severity, created_at DESC);

ALTER TABLE governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_evidence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE governance_policies, business_intelligence_decisions, kpi_evidence_snapshots, governance_alerts FROM anon;
CREATE POLICY governance_policies_tenant ON governance_policies FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY bi_decisions_tenant ON business_intelligence_decisions FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY kpi_evidence_tenant ON kpi_evidence_snapshots FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY governance_alerts_tenant ON governance_alerts FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());

CREATE OR REPLACE FUNCTION public.can_execute_bi_decision(p_decision_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_intelligence_decisions d
    WHERE d.company_id=public.current_company_id() AND d.decision_key=p_decision_key
      AND d.status='APPROVED' AND COALESCE(d.confidence,0) >= 0.80
  ) AND public.is_continuous_trust_healthy('production');
$$;
GRANT EXECUTE ON FUNCTION public.can_execute_bi_decision(text) TO authenticated;
