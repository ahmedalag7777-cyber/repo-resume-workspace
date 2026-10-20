-- Cover the foreign-key columns used by the governed import lineage path.
-- These indexes are intentionally additive; unused-index cleanup is a separate
-- evidence-driven decision and is not coupled to this migration.
CREATE INDEX IF NOT EXISTS idx_import_field_lineage_company_id
  ON public.import_field_lineage (company_id);

CREATE INDEX IF NOT EXISTS idx_import_field_lineage_job_id
  ON public.import_field_lineage (job_id);

CREATE INDEX IF NOT EXISTS idx_import_field_lineage_job_company
  ON public.import_field_lineage (job_id, company_id);

CREATE INDEX IF NOT EXISTS idx_import_field_lineage_job_row_id
  ON public.import_field_lineage (job_row_id);

CREATE INDEX IF NOT EXISTS idx_import_field_lineage_job_row_company
  ON public.import_field_lineage (job_row_id, company_id);

CREATE INDEX IF NOT EXISTS idx_import_job_rows_job_company
  ON public.import_job_rows (job_id, company_id);
