-- Close the remaining tenant boundary on per-row import state.
-- import_job_rows was added after the canonical tenant migration and therefore needs
-- its own explicit RLS policy keyed by the durable company_id added by hardening.

ALTER TABLE import_job_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS tenant_insert_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS tenant_update_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS tenant_delete_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS anon_select_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS anon_insert_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS anon_update_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS anon_delete_import_job_rows ON import_job_rows;

CREATE POLICY tenant_select_import_job_rows ON import_job_rows
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY tenant_insert_import_job_rows ON import_job_rows
  FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_update_import_job_rows ON import_job_rows
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_delete_import_job_rows ON import_job_rows
  FOR DELETE TO authenticated USING (company_id = public.current_company_id());

REVOKE ALL ON TABLE import_job_rows FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE import_job_rows TO authenticated;

CREATE INDEX IF NOT EXISTS idx_import_job_rows_company_job_row
  ON import_job_rows(company_id, job_id, row_number);
