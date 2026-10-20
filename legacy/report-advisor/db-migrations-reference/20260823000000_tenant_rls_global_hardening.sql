-- Global tenant isolation hardening.
-- The original prototype schema granted anon/authenticated full CRUD with USING(true).
-- Production mode is now fail-closed: authenticated users can access only the
-- company resolved by public.current_company_id(). Child tables inherit scope
-- through their parent company-owned row.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'branches','warehouses','categories','customers','suppliers','products',
    'sales_invoices','purchase_invoices','payments','inventory_movements',
    'inventory_balances','imports','recommendations','alerts','forecasts','audit_logs',
    'file_records','import_profiles','import_snapshots','import_jobs',
    'data_quality_reports','import_field_lineage'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS anon_select_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS anon_insert_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS anon_update_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS anon_delete_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_select_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_insert_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_update_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_delete_%I ON %I', t, t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
  END LOOP;
END $$;

-- Direct company-owned tables.
CREATE POLICY tenant_branches ON branches FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_warehouses ON warehouses FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_categories ON categories FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_customers ON customers FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_suppliers ON suppliers FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_products ON products FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_sales_invoices ON sales_invoices FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_purchase_invoices ON purchase_invoices FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_payments ON payments FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_inventory_movements ON inventory_movements FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_inventory_balances ON inventory_balances FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_imports ON imports FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_recommendations ON recommendations FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_alerts ON alerts FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_forecasts ON forecasts FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_audit_logs ON audit_logs FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_file_records ON file_records FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_import_profiles ON import_profiles FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_import_snapshots ON import_snapshots FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_import_jobs ON import_jobs FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_data_quality_reports ON data_quality_reports FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tenant_import_field_lineage ON import_field_lineage FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

-- Child tables inherit the company scope from their parent.
CREATE POLICY tenant_sale_items ON sale_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sales_invoices i
    WHERE i.id = sale_items.invoice_id
      AND i.company_id = public.current_company_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales_invoices i
    WHERE i.id = sale_items.invoice_id
      AND i.company_id = public.current_company_id()
  ));

CREATE POLICY tenant_purchase_items ON purchase_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM purchase_invoices i
    WHERE i.id = purchase_items.invoice_id
      AND i.company_id = public.current_company_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_invoices i
    WHERE i.id = purchase_items.invoice_id
      AND i.company_id = public.current_company_id()
  ));

CREATE POLICY tenant_import_rows ON import_rows FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM imports i
    WHERE i.id = import_rows.import_id
      AND i.company_id = public.current_company_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM imports i
    WHERE i.id = import_rows.import_id
      AND i.company_id = public.current_company_id()
  ));

CREATE POLICY tenant_import_job_rows ON import_job_rows FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM import_jobs j
    WHERE j.id = import_job_rows.job_id
      AND j.company_id = public.current_company_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM import_jobs j
    WHERE j.id = import_job_rows.job_id
      AND j.company_id = public.current_company_id()
  ));

-- Company rows themselves are visible only to an authenticated member of that company.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_companies ON companies;
DROP POLICY IF EXISTS anon_insert_companies ON companies;
DROP POLICY IF EXISTS anon_update_companies ON companies;
DROP POLICY IF EXISTS anon_delete_companies ON companies;
DROP POLICY IF EXISTS authenticated_select_companies ON companies;
DROP POLICY IF EXISTS authenticated_insert_companies ON companies;
DROP POLICY IF EXISTS authenticated_update_companies ON companies;
DROP POLICY IF EXISTS authenticated_delete_companies ON companies;
REVOKE ALL ON TABLE companies FROM anon;
CREATE POLICY tenant_companies_select ON companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());
CREATE POLICY tenant_companies_update ON companies FOR UPDATE TO authenticated
  USING (id = public.current_company_id())
  WITH CHECK (id = public.current_company_id());

-- Synonym dictionary is intentionally global reference data: anonymous access and
-- client writes are disabled; authenticated users may read the curated dictionary.
ALTER TABLE synonym_dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_select_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS anon_insert_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS anon_update_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS anon_delete_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS authenticated_select_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS authenticated_insert_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS authenticated_update_synonym_dictionary ON synonym_dictionary;
DROP POLICY IF EXISTS authenticated_delete_synonym_dictionary ON synonym_dictionary;
REVOKE ALL ON TABLE synonym_dictionary FROM anon;
CREATE POLICY authenticated_read_synonym_dictionary ON synonym_dictionary
  FOR SELECT TO authenticated USING (true);

-- company_memberships remains governed by its canonical self-read policy.
REVOKE ALL ON TABLE company_memberships FROM anon;

COMMENT ON TABLE companies IS 'Production tenant boundary: authenticated access is scoped through public.current_company_id().';
COMMENT ON TABLE synonym_dictionary IS 'Global curated reference data: authenticated read-only; no anonymous access or client writes.';
