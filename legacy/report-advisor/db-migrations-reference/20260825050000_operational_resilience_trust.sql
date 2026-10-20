-- Phase F: operational resilience, SLO evidence, incident ledger and expiring trust certification.
CREATE TABLE IF NOT EXISTS operational_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  component text NOT NULL, status text NOT NULL CHECK (status IN ('healthy','degraded','critical','unknown')),
  observed_at timestamptz NOT NULL DEFAULT now(), latency_ms numeric, error_rate numeric, queue_depth integer,
  stale_jobs integer, dead_letter_count integer, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, component, observed_at)
);
CREATE INDEX IF NOT EXISTS idx_operational_health_latest ON operational_health_snapshots(company_id, component, observed_at DESC);

CREATE TABLE IF NOT EXISTS backup_verification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  backup_ref text NOT NULL, verified_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL CHECK (status IN ('passed','failed','partial')),
  backup_started_at timestamptz, backup_completed_at timestamptz, restore_started_at timestamptz, restore_completed_at timestamptz,
  rpo_seconds numeric, rto_seconds numeric, integrity_hash text, evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_backup_verification_latest ON backup_verification_runs(company_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS slo_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service text NOT NULL, window_start timestamptz NOT NULL, window_end timestamptz NOT NULL,
  target numeric NOT NULL CHECK (target >= 0), actual numeric NOT NULL CHECK (actual >= 0),
  metric text NOT NULL, budget_remaining numeric, status text NOT NULL CHECK (status IN ('pass','breach','unknown')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, service, metric, window_start, window_end)
);

CREATE TABLE IF NOT EXISTS incident_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  incident_key text NOT NULL, severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL CHECK (status IN ('open','mitigated','resolved','closed')), detected_at timestamptz NOT NULL,
  mitigated_at timestamptz, resolved_at timestamptz, root_cause text, impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, incident_key)
);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_open ON incident_evidence(company_id, status, severity, detected_at DESC);

CREATE TABLE IF NOT EXISTS trust_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  certificate_key text NOT NULL, status text NOT NULL CHECK (status IN ('valid','expired','revoked','blocked')),
  issued_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  evidence_hash text NOT NULL, blocker_count integer NOT NULL DEFAULT 0 CHECK (blocker_count >= 0),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb, UNIQUE(company_id, certificate_key)
);
CREATE INDEX IF NOT EXISTS idx_trust_certifications_expiry ON trust_certifications(company_id, status, expires_at);

ALTER TABLE operational_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_verification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slo_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_certifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE operational_health_snapshots, backup_verification_runs, slo_evidence, incident_evidence, trust_certifications FROM anon;
DROP POLICY IF EXISTS authenticated_operational_health_tenant ON operational_health_snapshots;
CREATE POLICY authenticated_operational_health_tenant ON operational_health_snapshots FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_backup_verification_tenant ON backup_verification_runs;
CREATE POLICY authenticated_backup_verification_tenant ON backup_verification_runs FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_slo_evidence_tenant ON slo_evidence;
CREATE POLICY authenticated_slo_evidence_tenant ON slo_evidence FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_incident_evidence_tenant ON incident_evidence;
CREATE POLICY authenticated_incident_evidence_tenant ON incident_evidence FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
DROP POLICY IF EXISTS authenticated_trust_certifications_tenant ON trust_certifications;
CREATE POLICY authenticated_trust_certifications_tenant ON trust_certifications FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE OR REPLACE FUNCTION public.is_trust_certificate_valid(p_certificate_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM trust_certifications
    WHERE company_id = public.current_company_id() AND certificate_key = p_certificate_key
      AND status = 'valid' AND blocker_count = 0 AND expires_at > now()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_trust_certificate_valid(text) TO authenticated;
