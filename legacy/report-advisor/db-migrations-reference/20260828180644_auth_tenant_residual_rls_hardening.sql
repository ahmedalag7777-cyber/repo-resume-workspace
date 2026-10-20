ALTER TABLE import_job_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS anon_insert_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS anon_update_import_job_rows ON import_job_rows;
DROP POLICY IF EXISTS anon_delete_import_job_rows ON import_job_rows;
REVOKE ALL ON TABLE import_job_rows FROM anon;

ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_import_rows ON import_rows;
DROP POLICY IF EXISTS anon_insert_import_rows ON import_rows;
DROP POLICY IF EXISTS anon_update_import_rows ON import_rows;
DROP POLICY IF EXISTS anon_delete_import_rows ON import_rows;
DROP POLICY IF EXISTS tenant_import_rows ON import_rows;
CREATE POLICY tenant_import_rows ON import_rows FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM imports i WHERE i.id = import_rows.import_id AND i.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM imports i WHERE i.id = import_rows.import_id AND i.company_id = public.current_company_id()));
REVOKE ALL ON TABLE import_rows FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE import_rows TO authenticated;

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_sale_items ON sale_items;
DROP POLICY IF EXISTS anon_insert_sale_items ON sale_items;
DROP POLICY IF EXISTS anon_update_sale_items ON sale_items;
DROP POLICY IF EXISTS anon_delete_sale_items ON sale_items;
REVOKE ALL ON TABLE sale_items FROM anon;

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_purchase_items ON purchase_items;
DROP POLICY IF EXISTS anon_insert_purchase_items ON purchase_items;
DROP POLICY IF EXISTS anon_update_purchase_items ON purchase_items;
DROP POLICY IF EXISTS anon_delete_purchase_items ON purchase_items;
REVOKE ALL ON TABLE purchase_items FROM anon;

ALTER TABLE synonym_dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS anon_insert_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS anon_update_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS anon_delete_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS authenticated_read_synonym_dictionary ON synonym_dictionary;
CREATE POLICY authenticated_read_synonym_dictionary ON synonym_dictionary
  FOR SELECT TO authenticated USING (true);
REVOKE ALL ON TABLE synonym_dictionary FROM anon;
GRANT SELECT ON TABLE synonym_dictionary TO authenticated;
