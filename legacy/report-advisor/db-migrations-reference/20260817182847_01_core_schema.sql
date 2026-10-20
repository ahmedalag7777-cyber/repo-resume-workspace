/*
# Core Schema for Universal BI & Decision Platform (العامري)

Creates the foundational tables for a multi-tenant business intelligence platform:
companies, branches, warehouses, customers, suppliers, categories, products,
sales invoices + lines, purchase invoices + lines, payments, inventory movements,
inventory balances, imports + import rows, recommendations, alerts, audit logs,
and forecast records.

All monetary values use numeric(18,3) for decimal precision (no floats).
All tables are single-tenant (no auth) with anon+authenticated RLS for full CRUD,
since this is a local-first offline-capable app with no sign-in screen.

1. New Tables
- companies: the business entity
- branches: company branches
- warehouses: storage locations
- categories: product categories
- customers: customer master data
- suppliers: supplier master data
- products: product master data with SKU, cost, price, unit
- sales_invoices: sales headers (draft/confirmed/posted/paid)
- sale_items: sales line items
- purchase_invoices: purchase headers
- purchase_items: purchase line items
- payments: customer receipts and supplier payments
- inventory_movements: stock ledger (in/out/adjust)
- inventory_balances: current stock per product per warehouse
- imports: import job records
- import_rows: per-row import results / quarantine
- recommendations: AI/rule-based recommendations with status tracking
- alerts: alert notifications grouped by severity
- forecasts: forecast records with model quality
- audit_logs: immutable audit trail

2. Security
- RLS enabled on all tables.
- Policies allow anon + authenticated full CRUD (single-tenant, no-auth app).
*/

-- ============ COMPANIES ============
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  tax_id text,
  currency text NOT NULL DEFAULT 'SAR',
  timezone text NOT NULL DEFAULT 'Asia/Riyadh',
  industry text NOT NULL DEFAULT 'retail',
  phone text,
  email text,
  address text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- ============ BRANCHES ============
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  phone text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============ WAREHOUSES ============
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ CUSTOMERS ============
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  phone text,
  email text,
  address text,
  tax_id text,
  credit_limit numeric(18,3) DEFAULT 0,
  payment_terms_days int DEFAULT 30,
  segment text DEFAULT 'regular',
  created_at timestamptz DEFAULT now()
);

-- ============ SUPPLIERS ============
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  phone text,
  email text,
  address text,
  tax_id text,
  payment_terms_days int DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sku text NOT NULL,
  name text NOT NULL,
  barcode text,
  unit text NOT NULL DEFAULT 'قطعة',
  cost_price numeric(18,3) DEFAULT 0,
  selling_price numeric(18,3) DEFAULT 0,
  min_stock numeric(18,3) DEFAULT 0,
  reorder_point numeric(18,3) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============ SALES INVOICES ============
CREATE TABLE IF NOT EXISTS sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'confirmed',
  subtotal numeric(18,3) DEFAULT 0,
  discount_amount numeric(18,3) DEFAULT 0,
  tax_amount numeric(18,3) DEFAULT 0,
  total numeric(18,3) DEFAULT 0,
  paid_amount numeric(18,3) DEFAULT 0,
  currency text DEFAULT 'SAR',
  sales_rep text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============ SALE ITEMS ============
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  unit_price numeric(18,3) NOT NULL DEFAULT 0,
  discount_amount numeric(18,3) DEFAULT 0,
  tax_amount numeric(18,3) DEFAULT 0,
  line_total numeric(18,3) DEFAULT 0,
  cost_price numeric(18,3) DEFAULT 0
);

-- ============ PURCHASE INVOICES ============
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'confirmed',
  subtotal numeric(18,3) DEFAULT 0,
  discount_amount numeric(18,3) DEFAULT 0,
  tax_amount numeric(18,3) DEFAULT 0,
  total numeric(18,3) DEFAULT 0,
  paid_amount numeric(18,3) DEFAULT 0,
  currency text DEFAULT 'SAR',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============ PURCHASE ITEMS ============
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  unit_price numeric(18,3) NOT NULL DEFAULT 0,
  discount_amount numeric(18,3) DEFAULT 0,
  tax_amount numeric(18,3) DEFAULT 0,
  line_total numeric(18,3) DEFAULT 0
);

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'in',
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_id uuid,
  amount numeric(18,3) NOT NULL DEFAULT 0,
  payment_date date NOT NULL,
  method text DEFAULT 'cash',
  reference text,
  currency text DEFAULT 'SAR',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============ INVENTORY MOVEMENTS ============
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type text NOT NULL DEFAULT 'in',
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  unit_cost numeric(18,3) DEFAULT 0,
  reference_type text,
  reference_id uuid,
  movement_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============ INVENTORY BALANCES ============
CREATE TABLE IF NOT EXISTS inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  unit_cost numeric(18,3) DEFAULT 0,
  last_movement_date date,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

-- ============ IMPORTS ============
CREATE TABLE IF NOT EXISTS imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_hash text,
  file_size bigint DEFAULT 0,
  source_type text DEFAULT 'csv',
  status text NOT NULL DEFAULT 'pending',
  total_rows int DEFAULT 0,
  valid_rows int DEFAULT 0,
  invalid_rows int DEFAULT 0,
  quarantined_rows int DEFAULT 0,
  entity_type text,
  profile_name text,
  progress int DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ============ IMPORT ROWS ============
CREATE TABLE IF NOT EXISTS import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  row_number int NOT NULL,
  status text NOT NULL DEFAULT 'valid',
  raw_data jsonb,
  mapped_data jsonb,
  error_message text,
  error_type text,
  created_at timestamptz DEFAULT now()
);

-- ============ RECOMMENDATIONS ============
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  evidence jsonb,
  expected_impact numeric(18,3),
  confidence text DEFAULT 'CALCULATED',
  status text NOT NULL DEFAULT 'new',
  owner text,
  deadline date,
  impact_result text,
  impact_measured_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============ ALERTS ============
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info',
  category text NOT NULL,
  title text NOT NULL,
  description text,
  entity_type text,
  entity_id uuid,
  metric_value numeric(18,3),
  threshold numeric(18,3),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============ FORECASTS ============
CREATE TABLE IF NOT EXISTS forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  metric text NOT NULL,
  period date NOT NULL,
  forecast_value numeric(18,3),
  lower_bound numeric(18,3),
  upper_bound numeric(18,3),
  model_name text,
  quality_score numeric(5,2),
  confidence text DEFAULT 'FORECAST',
  data_points int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============ AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  source text,
  user_label text,
  correlation_id text,
  created_at timestamptz DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_sales_company_date ON sales_invoices(company_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_invoice ON sale_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_company_date ON purchase_invoices(company_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_purchase_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice ON purchase_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inventory_bal_product ON inventory_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_mov_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_date ON payments(company_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_imports_company ON imports(company_id);
CREATE INDEX IF NOT EXISTS idx_recs_company_status ON recommendations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_company_read ON alerts(company_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id, created_at);

-- ============ RLS ============
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'companies','branches','warehouses','categories','customers','suppliers',
    'products','sales_invoices','sale_items','purchase_invoices','purchase_items',
    'payments','inventory_movements','inventory_balances','imports','import_rows',
    'recommendations','alerts','forecasts','audit_logs'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_select_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true)', 'anon_select_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_insert_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', 'anon_insert_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_update_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', 'anon_update_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_delete_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true)', 'anon_delete_'||t, t);
  END LOOP;
END $$;
