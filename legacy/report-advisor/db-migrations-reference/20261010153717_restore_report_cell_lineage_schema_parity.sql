-- Restore report-cell/field lineage in clean databases. Live staging contains this
-- relation, but earlier migrations in this repository did not recreate it, making
-- logical backup restoration fail when the data-only dump reaches this table.
CREATE TABLE IF NOT EXISTS public.report_cell_lineage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  source_version_id uuid NULL,
  report_execution_job_id uuid NULL,
  row_key text NOT NULL,
  source_locator text NOT NULL,
  source_field text NOT NULL,
  canonical_field text NOT NULL,
  transformation text NULL,
  metric_key text NULL,
  claim_key text NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT report_cell_lineage_pkey PRIMARY KEY (id),
  CONSTRAINT report_cell_lineage_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT report_cell_lineage_report_execution_job_id_fkey
    FOREIGN KEY (report_execution_job_id) REFERENCES public.report_execution_jobs(id) ON DELETE SET NULL,
  CONSTRAINT report_cell_lineage_source_version_id_fkey
    FOREIGN KEY (source_version_id) REFERENCES public.report_source_versions(id) ON DELETE CASCADE,
  CONSTRAINT report_cell_lineage_company_id_report_execution_job_id_row__key
    UNIQUE (company_id, report_execution_job_id, row_key, source_locator, canonical_field)
);

CREATE INDEX IF NOT EXISTS idx_report_cell_lineage_lookup
  ON public.report_cell_lineage USING btree (company_id, report_execution_job_id, row_key);
CREATE INDEX IF NOT EXISTS idx_report_cell_lineage_metric
  ON public.report_cell_lineage USING btree (company_id, metric_key, claim_key);

ALTER TABLE public.report_cell_lineage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.report_cell_lineage FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.report_cell_lineage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.report_cell_lineage TO service_role;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_cell_lineage'
      AND policyname = 'report_cell_lineage_tenant'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY report_cell_lineage_tenant
      ON public.report_cell_lineage
      FOR ALL TO authenticated
      USING (company_id = public.current_company_id())
      WITH CHECK (company_id = public.current_company_id())
    $policy$;
  END IF;
END;
$migration$;
