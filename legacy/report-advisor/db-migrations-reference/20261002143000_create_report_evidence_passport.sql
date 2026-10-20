-- Durable source-bound Evidence Passport schema.
-- No report re-import or canonical row mutation occurs here.

CREATE TABLE IF NOT EXISTS public.report_evidence_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_execution_job_id uuid NOT NULL REFERENCES public.report_execution_jobs(id) ON DELETE CASCADE,
  source_version_id uuid REFERENCES public.report_source_versions(id) ON DELETE RESTRICT,
  analysis_snapshot_id uuid REFERENCES public.source_analysis_snapshots(id) ON DELETE RESTRICT,
  source_hash text NOT NULL,
  source_path text NOT NULL,
  canonical_commit_count integer NOT NULL DEFAULT 0 CHECK (canonical_commit_count >= 0),
  canonical_dataset_count integer NOT NULL DEFAULT 0 CHECK (canonical_dataset_count >= 0),
  authoritative_row_count integer,
  canonical_coverage_status text NOT NULL CHECK (canonical_coverage_status IN ('FULL','PARTIAL','BLOCKED')),
  acceptance_status text NOT NULL CHECK (acceptance_status IN ('ACCEPTED','REVIEW','BLOCKED')),
  verification_status text NOT NULL CHECK (verification_status IN ('VERIFIED','UNVERIFIED','LEGACY_UNRESOLVED')),
  accepted_at timestamptz,
  accepted_by uuid,
  verified_at timestamptz,
  verified_by uuid,
  evidence_fingerprint text NOT NULL,
  lineage jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, evidence_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.report_evidence_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_execution_job_id uuid NOT NULL REFERENCES public.report_execution_jobs(id) ON DELETE CASCADE,
  source_version_id uuid REFERENCES public.report_source_versions(id) ON DELETE RESTRICT,
  evidence_snapshot_id uuid NOT NULL REFERENCES public.report_evidence_snapshots(id) ON DELETE RESTRICT,
  source_hash text NOT NULL,
  acceptance_status text NOT NULL CHECK (acceptance_status IN ('ACCEPTED','REVIEW','BLOCKED','LEGACY_UNRESOLVED')),
  verification_status text NOT NULL CHECK (verification_status IN ('VERIFIED','UNVERIFIED','LEGACY_UNRESOLVED')),
  decision_readiness text NOT NULL CHECK (decision_readiness IN ('READY','BLOCKED','INSUFFICIENT_SAMPLE','REVIEW')),
  prior_verification_state text,
  lineage jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, report_execution_job_id, source_hash)
);

CREATE INDEX IF NOT EXISTS idx_report_evidence_snapshots_source
  ON public.report_evidence_snapshots(company_id, source_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_evidence_snapshots_verified
  ON public.report_evidence_snapshots(company_id, verification_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_evidence_passports_source
  ON public.report_evidence_passports(company_id, source_hash, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_evidence_passports_ready
  ON public.report_evidence_passports(company_id, verification_status, decision_readiness, updated_at DESC);

ALTER TABLE public.report_evidence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_evidence_passports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.report_evidence_snapshots, public.report_evidence_passports FROM anon;
DROP POLICY IF EXISTS report_evidence_snapshots_tenant ON public.report_evidence_snapshots;
CREATE POLICY report_evidence_snapshots_tenant ON public.report_evidence_snapshots FOR SELECT TO authenticated USING (company_id = public.current_company_id());
DROP POLICY IF EXISTS report_evidence_passports_tenant ON public.report_evidence_passports;
CREATE POLICY report_evidence_passports_tenant ON public.report_evidence_passports FOR SELECT TO authenticated USING (company_id = public.current_company_id());