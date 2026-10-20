-- Inventory Liquidity & Velocity, Demand/Reorder and Cash-flow planning primitives.
-- Deterministic calculations only: AI/explanation layers must consume these results, never invent them.

CREATE OR REPLACE FUNCTION inventory_liquidity_velocity(
  p_company_id uuid,
  p_as_of date DEFAULT current_date,
  p_days integer DEFAULT 90
)
RETURNS TABLE(
  product_id uuid,
  sku text,
  product_name text,
  stock_qty numeric,
  stock_value numeric,
  last_sale_date date,
  days_since_sale integer,
  avg_daily_sales numeric,
  avg_weekly_sales numeric,
  avg_half_month_sales numeric,
  avg_monthly_sales numeric,
  avg_half_year_sales numeric,
  avg_yearly_sales numeric,
  estimated_days_to_clear numeric,
  liquidity_class text
)
LANGUAGE sql
STABLE
AS $function$
WITH sales AS (
  SELECT si.product_id,
         sum(si.quantity) FILTER (WHERE inv.invoice_date >= p_as_of - greatest(p_days,1)) AS qty,
         max(inv.invoice_date) AS last_sale
  FROM sale_items si
  JOIN sales_invoices inv ON inv.id = si.invoice_id
  WHERE inv.company_id = p_company_id
    AND inv.invoice_date <= p_as_of
    AND inv.status IN ('confirmed','posted','paid')
  GROUP BY si.product_id
), stock AS (
  SELECT product_id, sum(quantity) AS qty
  FROM inventory_balances
  WHERE company_id = p_company_id
  GROUP BY product_id
), base AS (
  SELECT p.id, p.sku, p.name, coalesce(st.qty,0) stock_qty,
         coalesce(st.qty,0) * coalesce(p.cost_price,0) stock_value,
         s.last_sale,
         coalesce(s.qty,0) / greatest(p_days,1)::numeric daily
  FROM products p
  LEFT JOIN stock st ON st.product_id = p.id
  LEFT JOIN sales s ON s.product_id = p.id
  WHERE p.company_id = p_company_id AND p.is_active
)
SELECT id, sku, name, stock_qty, stock_value, last_sale,
       CASE WHEN last_sale IS NULL THEN NULL ELSE (p_as_of-last_sale)::integer END,
       daily, daily*7, daily*15, daily*30, daily*182.5, daily*365,
       CASE WHEN daily > 0 THEN stock_qty/daily ELSE NULL END,
       CASE
         WHEN stock_qty <= 0 THEN 'out_of_stock'
         WHEN daily <= 0 OR last_sale IS NULL THEN 'frozen'
         WHEN stock_qty/daily > 180 THEN 'frozen'
         ELSE 'moving'
       END
FROM base;
$function$;

CREATE OR REPLACE FUNCTION demand_reorder_snapshot(
  p_company_id uuid,
  p_as_of date DEFAULT current_date,
  p_days integer DEFAULT 90,
  p_lead_time_days numeric DEFAULT 7,
  p_safety_days numeric DEFAULT 3
)
RETURNS TABLE(
  product_id uuid,
  sku text,
  product_name text,
  current_stock numeric,
  avg_daily_demand numeric,
  minimum_stock numeric,
  reorder_point numeric,
  maximum_stock numeric,
  stockout_date date,
  qty_for_day numeric,
  qty_for_week numeric,
  qty_for_half_month numeric,
  qty_for_month numeric,
  suggested_order_qty numeric,
  urgency text,
  confidence text
)
LANGUAGE sql
STABLE
AS $function$
WITH v AS (
  SELECT * FROM inventory_liquidity_velocity(p_company_id,p_as_of,p_days)
), x AS (
 SELECT v.*, coalesce(avg_daily_sales,0) d,
        coalesce(stock_qty,0) s
 FROM v
)
SELECT product_id, sku, product_name, s, d,
       d * greatest(p_safety_days,0),
       d * greatest(p_lead_time_days+p_safety_days,0),
       d * greatest(p_lead_time_days+p_safety_days+30,0),
       CASE WHEN d > 0 THEN p_as_of + ceil(s/d)::integer ELSE NULL END,
       d, d*7, d*15, d*30,
       greatest(0, d*(p_lead_time_days+p_safety_days+30)-s),
       CASE WHEN s <= 0 THEN 'critical'
            WHEN d > 0 AND s/d <= p_lead_time_days THEN 'urgent'
            WHEN d > 0 AND s/d <= p_lead_time_days+p_safety_days THEN 'high'
            ELSE 'normal' END,
       CASE WHEN d <= 0 THEN 'insufficient_history'
            WHEN p_days >= 90 THEN 'high'
            WHEN p_days >= 30 THEN 'medium'
            ELSE 'low' END
FROM x;
$function$;

CREATE OR REPLACE FUNCTION cash_liquidity_snapshot(
  p_company_id uuid,
  p_from date DEFAULT current_date,
  p_to date DEFAULT current_date + 30
)
RETURNS TABLE(
  period_date date,
  inflows numeric,
  outflows numeric,
  net_cash numeric,
  cumulative_net numeric,
  risk_level text
)
LANGUAGE sql
STABLE
AS $function$
WITH days AS (
 SELECT generate_series(p_from,p_to,'1 day')::date d
), flow AS (
 SELECT payment_date d,
        sum(amount) FILTER (WHERE direction='in') inflow,
        sum(amount) FILTER (WHERE direction='out') outflow
 FROM payments
 WHERE company_id=p_company_id AND payment_date BETWEEN p_from AND p_to
 GROUP BY payment_date
), x AS (
 SELECT days.d, coalesce(inflow,0) inflow, coalesce(outflow,0) outflow
 FROM days LEFT JOIN flow ON flow.d=days.d
), y AS (
 SELECT d,inflow,outflow,inflow-outflow net,
        sum(inflow-outflow) OVER (ORDER BY d) cumulative
 FROM x
)
SELECT d,inflow,outflow,net,cumulative,
       CASE WHEN cumulative < 0 THEN 'critical'
            WHEN cumulative < greatest(outflow,1) THEN 'high'
            ELSE 'normal' END
FROM y ORDER BY d;
$function$;

CREATE INDEX IF NOT EXISTS idx_sales_invoices_company_date_status
ON sales_invoices(company_id, invoice_date, status);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_invoice
ON sale_items(product_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_date_direction
ON payments(company_id, payment_date, direction);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_company_product
ON inventory_balances(company_id, product_id);