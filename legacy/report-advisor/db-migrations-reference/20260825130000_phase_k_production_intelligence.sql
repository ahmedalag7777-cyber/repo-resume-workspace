-- Phase K/L/M foundation: durable watched-report execution, parse-once lineage,
-- chronological consolidation, bounded optimization, outcome calibration,
-- portfolio prioritization, executive evidence and production autonomy gates.

CREATE TABLE IF NOT EXISTS report_execution_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_key text NOT NULL, source_path text NOT NULL, source_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','leased','processing','completed','blocked','failed','dead_letter')) DEFAULT 'queued',
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb, attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0), lease_owner text, lease_expires_at timestamptz,
  last_error jsonb NOT NULL DEFAULT '{}'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  UNIQUE(company_id, job_key)
);
CREATE INDEX IF NOT EXISTS idx_report_execution_jobs_ready ON report_execution_jobs(company_id,status,created_at);

CREATE TABLE IF NOT EXISTS report_source_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_key text NOT NULL, source_path text NOT NULL, source_hash text NOT NULL,
  previous_version_id uuid REFERENCES report_source_versions(id) ON DELETE SET NULL, detected_at timestamptz NOT NULL DEFAULT now(),
  change_kind text NOT NULL CHECK (change_kind IN ('new','changed','renamed','deleted','unchanged')), tombstone boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, source_key, source_hash)
);
CREATE INDEX IF NOT EXISTS idx_report_source_versions_latest ON report_source_versions(company_id,source_key,detected_at DESC);

CREATE TABLE IF NOT EXISTS canonical_text_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_version_id uuid NOT NULL REFERENCES report_source_versions(id) ON DELETE CASCADE, source_hash text NOT NULL, text_hash text NOT NULL,
  processing_version text NOT NULL, extraction_route text NOT NULL CHECK (extraction_route IN ('pdf_text','table','ocr','structured','fallback')),
  quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 1), canonical_text text NOT NULL,
  layout_manifest jsonb NOT NULL DEFAULT '{}'::jsonb, provenance jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,source_hash,text_hash,processing_version)
);
CREATE INDEX IF NOT EXISTS idx_canonical_text_source ON canonical_text_artifacts(company_id,source_version_id,created_at DESC);

CREATE TABLE IF NOT EXISTS report_row_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_version_id uuid NOT NULL REFERENCES report_source_versions(id) ON DELETE CASCADE, row_key text NOT NULL, row_hash text NOT NULL,
  prior_row_hash text, state text NOT NULL CHECK (state IN ('new','changed','unchanged','deleted','quarantined')),
  first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id,source_version_id,row_key)
);
CREATE INDEX IF NOT EXISTS idx_report_row_lineage_lookup ON report_row_lineage(company_id,row_key,last_seen_at DESC);

CREATE TABLE IF NOT EXISTS report_consolidation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_key text NOT NULL, status text NOT NULL CHECK (status IN ('proposed','running','completed','blocked','failed')) DEFAULT 'proposed',
  as_of timestamptz NOT NULL DEFAULT now(), source_precedence jsonb NOT NULL DEFAULT '[]'::jsonb,
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, UNIQUE(company_id,run_key)
);

CREATE TABLE IF NOT EXISTS report_consolidation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES report_consolidation_runs(id) ON DELETE CASCADE, business_key text NOT NULL,
  source_version_id uuid NOT NULL REFERENCES report_source_versions(id) ON DELETE RESTRICT, precedence_rank integer NOT NULL CHECK (precedence_rank >= 0),
  selected boolean NOT NULL DEFAULT false, value jsonb NOT NULL DEFAULT '{}'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id,run_id,business_key,source_version_id)
);
CREATE INDEX IF NOT EXISTS idx_consolidation_items_selected ON report_consolidation_items(company_id,run_id,business_key,selected);

CREATE TABLE IF NOT EXISTS bounded_scenario_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scenario_key text NOT NULL, state_snapshot_id uuid REFERENCES business_state_snapshots(id) ON DELETE SET NULL, objective text NOT NULL,
  horizon_days integer NOT NULL CHECK (horizon_days > 0), constraints jsonb NOT NULL DEFAULT '{}'::jsonb, risk_budget numeric NOT NULL CHECK (risk_budget >= 0),
  protected_liquidity numeric NOT NULL DEFAULT 0 CHECK (protected_liquidity >= 0), input_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL CHECK (status IN ('proposed','computed','blocked','failed')) DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,scenario_key)
);

CREATE TABLE IF NOT EXISTS decision_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision_key text NOT NULL, priority_score numeric NOT NULL DEFAULT 0, materiality_score numeric NOT NULL DEFAULT 0,
  confidence_score numeric NOT NULL DEFAULT 0, risk_consumption numeric NOT NULL DEFAULT 0 CHECK (risk_consumption >= 0),
  escalation_required boolean NOT NULL DEFAULT false, status text NOT NULL CHECK (status IN ('candidate','ready','approved','executed','deferred','blocked')) DEFAULT 'candidate',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,decision_key)
);
CREATE INDEX IF NOT EXISTS idx_decision_portfolio_rank ON decision_portfolio_items(company_id,status,priority_score DESC,materiality_score DESC);

CREATE TABLE IF NOT EXISTS autonomy_domain_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain_key text NOT NULL, enabled boolean NOT NULL DEFAULT false, min_evidence_quality numeric NOT NULL DEFAULT 0.9 CHECK (min_evidence_quality BETWEEN 0 AND 1),
  min_confidence numeric NOT NULL DEFAULT 0.9 CHECK (min_confidence BETWEEN 0 AND 1), max_risk_budget numeric NOT NULL DEFAULT 0 CHECK (max_risk_budget >= 0),
  rollback_enabled boolean NOT NULL DEFAULT true, trust_state text NOT NULL CHECK (trust_state IN ('eligible','degraded','blocked')) DEFAULT 'blocked',
  last_certified_at timestamptz, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, UNIQUE(company_id,domain_key)
);

CREATE TABLE IF NOT EXISTS autonomy_certification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  certification_key text NOT NULL, status text NOT NULL CHECK (status IN ('passed','failed','blocked')),
  trust_score numeric CHECK (trust_score BETWEEN 0 AND 1), evidence_quality numeric CHECK (evidence_quality BETWEEN 0 AND 1),
  risk_budget_valid boolean NOT NULL DEFAULT false, rollback_verified boolean NOT NULL DEFAULT false, isolation_verified boolean NOT NULL DEFAULT false,
  gates jsonb NOT NULL DEFAULT '{}'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,certification_key)
);

CREATE TABLE IF NOT EXISTS autonomy_rollback_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  drill_key text NOT NULL, target_domain text NOT NULL, status text NOT NULL CHECK (status IN ('planned','passed','failed')) DEFAULT 'planned',
  pre_state jsonb NOT NULL DEFAULT '{}'::jsonb, rollback_state jsonb NOT NULL DEFAULT '{}'::jsonb, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_at timestamptz, UNIQUE(company_id,drill_key)
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['report_execution_jobs','report_source_versions','canonical_text_artifacts','report_row_lineage','report_consolidation_runs','report_consolidation_items','bounded_scenario_runs','decision_portfolio_items','autonomy_domain_controls','autonomy_certification_runs','autonomy_rollback_drills'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id())', t || '_tenant', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.can_certify_autonomous_domain(p_domain_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM autonomy_domain_controls c
    WHERE c.company_id=public.current_company_id() AND c.domain_key=p_domain_key AND c.enabled AND c.trust_state='eligible' AND c.rollback_enabled
  ) AND public.is_continuous_trust_healthy('production')
  AND NOT EXISTS (SELECT 1 FROM control_plane_drift_events d WHERE d.company_id=public.current_company_id() AND d.severity='critical' AND d.status IN ('open','blocked'));
$$;
GRANT EXECUTE ON FUNCTION public.can_certify_autonomous_domain(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_report_execution_job(p_job_id uuid, p_lease_owner text, p_lease_seconds integer DEFAULT 300)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
  UPDATE report_execution_jobs
  SET status='leased', lease_owner=p_lease_owner, lease_expires_at=now() + make_interval(secs => greatest(p_lease_seconds,30)),
      attempt=attempt+1, updated_at=now()
  WHERE id=p_job_id AND company_id=public.current_company_id() AND status IN ('queued','leased','processing')
    AND (lease_expires_at IS NULL OR lease_expires_at < now()) AND attempt < max_attempts;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_report_execution_job(uuid,text,integer) TO authenticated;
