-- Phase I hardening: risk budgets, explainable decision lineage, anomaly correlation,
-- human override learning and governed scenario simulation. Evidence-first and tenant-scoped.
CREATE TABLE IF NOT EXISTS business_risk_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  budget_key text NOT NULL, domain text NOT NULL, max_risk numeric NOT NULL CHECK (max_risk >= 0),
  consumed_risk numeric NOT NULL DEFAULT 0 CHECK (consumed_risk >= 0), status text NOT NULL CHECK (status IN ('active','exhausted','blocked','expired')),
  effective_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, budget_key)
);

CREATE TABLE IF NOT EXISTS decision_graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision_key text NOT NULL, node_key text NOT NULL, node_type text NOT NULL,
  source_ref text, value jsonb NOT NULL DEFAULT '{}'::jsonb, confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, decision_key, node_key)
);

CREATE TABLE IF NOT EXISTS decision_graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision_key text NOT NULL, from_node text NOT NULL, to_node text NOT NULL, relation text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, decision_key, from_node, to_node, relation)
);

CREATE TABLE IF NOT EXISTS anomaly_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  correlation_key text NOT NULL, domain text NOT NULL, severity text NOT NULL CHECK (severity IN ('info','warning','high','critical')),
  signal_count integer NOT NULL CHECK (signal_count >= 1), confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  signals jsonb NOT NULL DEFAULT '[]'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('open','acknowledged','resolved','suppressed')) DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id, correlation_key)
);

CREATE TABLE IF NOT EXISTS human_override_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision_key text NOT NULL, original_status text NOT NULL, override_status text NOT NULL,
  reason text NOT NULL, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, learned_signal jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id, decision_key, created_at)
);

CREATE TABLE IF NOT EXISTS intelligence_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain text NOT NULL, data_quality numeric NOT NULL CHECK (data_quality >= 0 AND data_quality <= 1),
  model_quality numeric NOT NULL CHECK (model_quality >= 0 AND model_quality <= 1), evidence_quality numeric NOT NULL CHECK (evidence_quality >= 0 AND evidence_quality <= 1),
  composite_score numeric NOT NULL CHECK (composite_score >= 0 AND composite_score <= 1),
  status text NOT NULL CHECK (status IN ('trusted','degraded','blocked')), evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id, domain, observed_at)
);

CREATE TABLE IF NOT EXISTS governed_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scenario_key text NOT NULL, assumptions jsonb NOT NULL DEFAULT '{}'::jsonb, outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1), risk_score numeric CHECK (risk_score >= 0),
  status text NOT NULL CHECK (status IN ('draft','simulated','approved','blocked','expired')) DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, UNIQUE(company_id, scenario_key)
);

ALTER TABLE business_risk_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_override_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE governed_scenarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE business_risk_budgets, decision_graph_nodes, decision_graph_edges, anomaly_correlations, human_override_feedback, intelligence_quality_scores, governed_scenarios FROM anon;
CREATE POLICY business_risk_budgets_tenant ON business_risk_budgets FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY decision_graph_nodes_tenant ON decision_graph_nodes FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY decision_graph_edges_tenant ON decision_graph_edges FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY anomaly_correlations_tenant ON anomaly_correlations FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY human_override_feedback_tenant ON human_override_feedback FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY intelligence_quality_scores_tenant ON intelligence_quality_scores FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY governed_scenarios_tenant ON governed_scenarios FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());

CREATE OR REPLACE FUNCTION public.can_execute_bi_decision(p_decision_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_intelligence_decisions d
    JOIN governance_policies p ON p.company_id=d.company_id AND p.policy_key=d.policy_key AND p.status='active'
      AND p.effective_at <= now() AND (p.expires_at IS NULL OR p.expires_at > now())
    LEFT JOIN business_risk_budgets b ON b.company_id=d.company_id AND b.domain=d.decision_type AND b.status='active'
    WHERE d.company_id=public.current_company_id() AND d.decision_key=p_decision_key
      AND d.status='APPROVED' AND COALESCE(d.confidence,0) >= 0.80
      AND COALESCE(jsonb_typeof(d.evidence),'null')='object'
      AND (b.id IS NULL OR b.consumed_risk < b.max_risk)
  ) AND public.is_continuous_trust_healthy('production');
$$;
GRANT EXECUTE ON FUNCTION public.can_execute_bi_decision(text) TO authenticated;
