-- Canonical tenant resolver for the production SaaS boundary.
-- This migration evolves the earlier tenant membership primitive rather than
-- recreating it with a divergent schema. The existing table remains the
-- canonical storage object; is_default is added idempotently when absent.

ALTER TABLE company_memberships
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_memberships_one_default
  ON company_memberships(user_id)
  WHERE is_active = true AND is_default = true;
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_active
  ON company_memberships(user_id, is_active, is_default);
CREATE INDEX IF NOT EXISTS idx_company_memberships_company_active
  ON company_memberships(company_id, is_active);

ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_memberships_select_self ON company_memberships;
CREATE POLICY company_memberships_select_self
  ON company_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.company_id
  FROM company_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.is_active = true
    AND cm.is_default = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION current_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_company_id() TO authenticated;

COMMENT ON FUNCTION current_company_id() IS
  'Canonical tenant context derived from authenticated identity; never accepts a client-supplied company_id.';

-- Replace every legacy permissive policy on company-owned tables.
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','branches','warehouses','categories','customers','suppliers',
    'products','sales_invoices','purchase_invoices','payments',
    'inventory_movements','inventory_balances','imports','recommendations',
    'alerts','forecasts','audit_logs','file_records','import_profiles',
    'import_snapshots','import_jobs','data_quality_reports','import_field_lineage'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='company_id'
    ) THEN
      EXECUTE format('CREATE POLICY tenant_select ON public.%I FOR SELECT TO authenticated USING (company_id = public.current_company_id())', t);
      EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id())', t);
      EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id())', t);
      EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING (company_id = public.current_company_id())', t);
    END IF;
  END LOOP;
END $$;

-- Child invoice rows have no company_id; authorization follows their parent invoice.
DO $$
BEGIN
  IF to_regclass('public.sale_items') IS NOT NULL THEN
    ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_select ON sale_items;
    DROP POLICY IF EXISTS tenant_insert ON sale_items;
    DROP POLICY IF EXISTS tenant_update ON sale_items;
    DROP POLICY IF EXISTS tenant_delete ON sale_items;
    CREATE POLICY tenant_select ON sale_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM sales_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));
    CREATE POLICY tenant_insert ON sale_items FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM sales_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));
    CREATE POLICY tenant_update ON sale_items FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM sales_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM sales_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));
    CREATE POLICY tenant_delete ON sale_items FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM sales_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));
  END IF;
  IF to_regclass('public.purchase_items') IS NOT NULL THEN
    ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_select ON purchase_items;
    DROP POLICY IF EXISTS tenant_insert ON purchase_items;
    DROP POLICY IF EXISTS tenant_update ON purchase_items;
    DROP POLICY IF EXISTS tenant_delete ON purchase_items;
    CREATE POLICY tenant_select ON purchase_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM purchase_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));
    CREATE POLICY tenant_insert ON purchase_items FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM purchase_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));
    CREATE POLICY tenant_update ON purchase_items FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM purchase_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()))
      WITH CHECK (EXISTS (SELECT 1 FROM purchase_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));
    CREATE POLICY tenant_delete ON purchase_items FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM purchase_invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));
  END IF;
END $$;

-- Anonymous access is explicitly prohibited for production tenant-owned data.
REVOKE ALL ON TABLE company_memberships FROM anon;
REVOKE ALL ON TABLE company_memberships FROM authenticated;
GRANT SELECT ON TABLE company_memberships TO authenticated;
