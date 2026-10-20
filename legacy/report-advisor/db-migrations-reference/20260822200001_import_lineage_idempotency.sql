-- A0.4/A0.5 hardening: durable import idempotency and field-level lineage.
-- Nullable additions are backward-compatible with existing jobs; partial uniqueness
-- prevents duplicate execution without rewriting historical rows.

ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS source_fingerprint text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_jobs_company_idempotency
  ON import_jobs(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_import_jobs_company_source_fingerprint
  ON import_jobs(company_id, source_fingerprint)
  WHERE source_fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS import_field_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  job_row_id uuid REFERENCES import_job_rows(id) ON DELETE CASCADE,
  source_field text NOT NULL,
  source_locator text,
  canonical_field text NOT NULL,
  target_table text,
  target_column text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(5,4),
  decision text NOT NULL DEFAULT 'review',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_field_lineage_confidence_range
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT import_field_lineage_decision_valid
    CHECK (decision IN ('approved','review','quarantine','rejected'))
);

CREATE INDEX IF NOT EXISTS idx_import_field_lineage_job
  ON import_field_lineage(company_id, job_id);
CREATE INDEX IF NOT EXISTS idx_import_field_lineage_row
  ON import_field_lineage(job_row_id);
CREATE INDEX IF NOT EXISTS idx_import_field_lineage_canonical
  ON import_field_lineage(company_id, canonical_field);

ALTER TABLE import_field_lineage ENABLE ROW LEVEL SECURITY;

-- Do not recreate permissive tenant policies here. The canonical membership
-- policy remains responsible for authenticated access; anonymous access is
-- explicitly prohibited by the File Intelligence lockdown migration.
DROP POLICY IF EXISTS anon_select_import_field_lineage ON import_field_lineage;
DROP POLICY IF EXISTS anon_insert_import_field_lineage ON import_field_lineage;
DROP POLICY IF EXISTS anon_update_import_field_lineage ON import_field_lineage;
DROP POLICY IF EXISTS anon_delete_import_field_lineage ON import_field_lineage;
REVOKE ALL ON TABLE import_field_lineage FROM anon;

COMMENT ON TABLE import_field_lineage IS 'Durable field-level provenance for governed imports; every approved mapping must retain evidence and confidence.';
COMMENT ON COLUMN import_jobs.idempotency_key IS 'Caller/source supplied key used to prevent duplicate import execution within a company.';
COMMENT ON COLUMN import_jobs.source_fingerprint IS 'Stable source fingerprint used to detect replayed input independently of filename.';
