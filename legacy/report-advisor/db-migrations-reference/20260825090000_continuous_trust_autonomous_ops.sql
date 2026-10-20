-- Phase H: continuous trust and autonomous operations, evidence-first and fail-closed.
CREATE TABLE IF NOT EXISTS tenant_isolation_canary_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  run_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed','failed','blocked','unknown')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  evidence_hash text NOT NULL,
  assertions jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(company_id, run_key)
);

CREATE TABLE IF NOT EXISTS automation_remediation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  remediation_key text NOT NULL,
  component text NOT NULL,
  status text NOT NULL CHECK (status IN ('proposed','approved','executed','failed','blocked')),
  approval_required boolean NOT NULL DEFAULT true,
  idempotency_key text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(company_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS intelligence_safety_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain text NOT NULL,
  previous_threshold numeric NOT NULL,
  adjusted_threshold numeric NOT NULL,
  reason text NOT NULL,
  outcome_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, domain, effective_at)
);

CREATE TABLE IF NOT EXISTS billing_liveness_probes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  probe_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed','failed','blocked','unknown')),
  observed_at timestamptz NOT NULL DEFAULT now(),
  replay_safe boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, probe_key)
);

CREATE TABLE IF NOT EXISTS artifact_verification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  artifact_sha256 text NOT NULL,
  expected_sha256 text NOT NULL,
  status text NOT NULL CHECK (status IN ('verified','failed','blocked','unknown')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS incident_regression_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  incident_key text NOT NULL,
  regression_key text NOT NULL,
  test_path text NOT NULL,
  status text NOT NULL CHECK (status IN ('proposed','implemented','verified','failed')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, incident_key, regression_key)
);

ALTER TABLE tenant_isolation_canary_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_remediation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_safety_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_liveness_probes ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_verification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_regression_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE tenant_isolation_canary_runs, automation_remediation_runs, intelligence_safety_adjustments, billing_liveness_probes, artifact_verification_runs, incident_regression_links FROM anon;

CREATE POLICY tenant_isolation_canary_tenant ON tenant_isolation_canary_runs FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY automation_remediation_tenant ON automation_remediation_runs FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY intelligence_safety_tenant ON intelligence_safety_adjustments FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY billing_liveness_tenant ON billing_liveness_probes FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY artifact_verification_tenant ON artifact_verification_runs FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY incident_regression_tenant ON incident_regression_links FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE OR REPLACE FUNCTION public.is_continuous_trust_healthy(p_certificate_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_trust_certificate_valid(p_certificate_key)
    AND NOT EXISTS (SELECT 1 FROM tenant_isolation_canary_runs WHERE company_id = public.current_company_id() AND status IN ('failed','blocked'))
    AND NOT EXISTS (SELECT 1 FROM billing_liveness_probes WHERE company_id = public.current_company_id() AND status IN ('failed','blocked'))
    AND NOT EXISTS (SELECT 1 FROM artifact_verification_runs WHERE company_id = public.current_company_id() AND status IN ('failed','blocked'));
$$;
GRANT EXECUTE ON FUNCTION public.is_continuous_trust_healthy(text) TO authenticated;
