-- A0.4/A0.5 hardening: make lineage/job/row tenant consistency a DB invariant.
-- This migration deliberately fails closed: historical rows must be backfilled before
-- the NOT NULL/compound foreign-key constraints become authoritative.

ALTER TABLE import_job_rows
  ADD COLUMN IF NOT EXISTS company_id uuid;

UPDATE import_job_rows r
SET company_id = j.company_id
FROM import_jobs j
WHERE r.company_id IS NULL
  AND r.job_id = j.id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM import_job_rows WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'import_job_rows.company_id backfill incomplete';
  END IF;
END $$;

ALTER TABLE import_job_rows
  ALTER COLUMN company_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_jobs_id_company
  ON import_jobs(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_import_job_rows_id_company
  ON import_job_rows(id, company_id);

ALTER TABLE import_job_rows
  DROP CONSTRAINT IF EXISTS import_job_rows_job_company_fk;
ALTER TABLE import_job_rows
  ADD CONSTRAINT import_job_rows_job_company_fk
  FOREIGN KEY (job_id, company_id)
  REFERENCES import_jobs(id, company_id)
  ON DELETE CASCADE;

ALTER TABLE import_field_lineage
  DROP CONSTRAINT IF EXISTS import_field_lineage_job_company_fk;
ALTER TABLE import_field_lineage
  ADD CONSTRAINT import_field_lineage_job_company_fk
  FOREIGN KEY (job_id, company_id)
  REFERENCES import_jobs(id, company_id)
  ON DELETE CASCADE;

ALTER TABLE import_field_lineage
  DROP CONSTRAINT IF EXISTS import_field_lineage_row_company_fk;
ALTER TABLE import_field_lineage
  ADD CONSTRAINT import_field_lineage_row_company_fk
  FOREIGN KEY (job_row_id, company_id)
  REFERENCES import_job_rows(id, company_id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_import_job_rows_company_job
  ON import_job_rows(company_id, job_id);

COMMENT ON COLUMN import_job_rows.company_id IS 'Tenant invariant copied from import_jobs and enforced by compound foreign key.';
