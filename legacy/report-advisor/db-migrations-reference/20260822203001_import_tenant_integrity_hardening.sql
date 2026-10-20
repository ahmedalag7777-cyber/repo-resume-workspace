-- A0.4/A0.5 hardening: make tenant boundaries database-enforceable for import lineage.
-- The earlier schema linked rows to jobs by UUID only; this migration adds composite
-- company/job and company/row keys so a cross-company lineage association cannot be
-- represented even by a privileged application path.

ALTER TABLE import_jobs
  ADD CONSTRAINT import_jobs_id_company_unique UNIQUE (id, company_id);

ALTER TABLE import_job_rows
  ADD COLUMN IF NOT EXISTS company_id uuid;

UPDATE import_job_rows r
SET company_id = j.company_id
FROM import_jobs j
WHERE j.id = r.job_id
  AND r.company_id IS NULL;

ALTER TABLE import_job_rows
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE import_job_rows
  ADD CONSTRAINT import_job_rows_id_company_unique UNIQUE (id, company_id);

ALTER TABLE import_job_rows
  ADD CONSTRAINT import_job_rows_company_job_fk
  FOREIGN KEY (job_id, company_id)
  REFERENCES import_jobs(id, company_id)
  ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.import_field_lineage'::regclass
      AND conname = 'import_field_lineage_job_company_fk'
  ) THEN
    ALTER TABLE import_field_lineage
      ADD CONSTRAINT import_field_lineage_job_company_fk
      FOREIGN KEY (job_id, company_id)
      REFERENCES import_jobs(id, company_id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.import_field_lineage'::regclass
      AND conname = 'import_field_lineage_row_company_fk'
  ) THEN
    ALTER TABLE import_field_lineage
      ADD CONSTRAINT import_field_lineage_row_company_fk
      FOREIGN KEY (job_row_id, company_id)
      REFERENCES import_job_rows(id, company_id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_job_rows_company_job
  ON import_job_rows(company_id, job_id);

CREATE INDEX IF NOT EXISTS idx_import_field_lineage_company_row
  ON import_field_lineage(company_id, job_row_id);

COMMENT ON COLUMN import_job_rows.company_id IS 'Denormalized tenant key used to enforce database-level job/row isolation.';
COMMENT ON CONSTRAINT import_job_rows_company_job_fk ON import_job_rows IS 'Prevents an import row from referencing a job belonging to another company.';
COMMENT ON CONSTRAINT import_field_lineage_job_company_fk ON import_field_lineage IS 'Prevents lineage from referencing a job belonging to another company.';
COMMENT ON CONSTRAINT import_field_lineage_row_company_fk ON import_field_lineage IS 'Prevents lineage from referencing a row belonging to another company.';
