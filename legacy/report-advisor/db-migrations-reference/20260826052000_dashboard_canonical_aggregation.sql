-- Canonical dashboard aggregation: one bounded server-side read for dashboard business truth.
-- Tenant authority is always current_company_id(); p_company_id is intentionally absent.
-- Display pagination remains separate from business aggregation.

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot(
  p_months integer DEFAULT 6,
  p_as_of date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_months integer := LEAST(GREATEST(COALESCE(p_months, 6), 1), 24);
  v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  WITH
  sales_base AS (
    SELECT s.id, s.customer_id, s.subtotal, s.total, s.paid_amount, s.invoice_date, s.due_date
    FROM public.sales_invoices s
    WHERE s.company_id = v_company_id
      AND s.status IS NOT NULL
      AND s.status NOT IN ('cancelled','void')
      AND s.invoice_date <= p_as_of
  ),
  sale_items_base AS (
    SELECT si.invoice_id, si.product_id, si.quantity, si.line_total, si.cost_price
    FROM public.sale_items si
    JOIN sales_base s ON s.id = si.invoice_id
  ),
  purchases_base AS (
    SELECT p.total, p.paid_amount
    FROM public.purchase_invoices p
    WHERE p.company_id = v_company_id
      AND p.status IS NOT NULL
      AND p.status NOT IN ('cancelled','void')
      AND p.invoice_date <= p_as_of
  ),
  inventory_base AS (
    SELECT ib.quantity, ib.unit_cost, ib.product_id
    FROM public.inventory_balances ib
    WHERE ib.company_id = v_company_id
  ),
  quality AS (
    SELECT
      (SELECT count(*) FROM sales_base WHERE subtotal IS NULL OR total IS NULL OR paid_amount IS NULL) AS bad_invoice_rows,
      (SELECT count(*) FROM sale_items_base WHERE quantity IS NULL OR cost_price IS NULL OR line_total IS NULL) AS bad_sale_item_rows,
      (SELECT count(*) FROM purchases_base WHERE total IS NULL OR paid_amount IS NULL) AS bad_purchase_rows,
      (SELECT count(*) FROM inventory_base WHERE quantity IS NULL OR unit_cost IS NULL) AS bad_inventory_rows
  ),
  kpis AS (
    SELECT
      CASE WHEN q.bad_invoice_rows = 0 THEN (SELECT sum(subtotal) FROM sales_base) END AS total_sales,
      CASE WHEN q.bad_sale_item_rows = 0 THEN (SELECT sum(quantity * cost_price) FROM sale_items_base) END AS total_cost,
      CASE WHEN q.bad_invoice_rows = 0 THEN (SELECT sum(total - paid_amount) FROM sales_base) END AS receivables,
      CASE WHEN q.bad_invoice_rows = 0 THEN (SELECT sum(CASE WHEN due_date IS NOT NULL AND due_date < p_as_of AND paid_amount < total THEN total-paid_amount ELSE 0 END) FROM sales_base) END AS overdue,
      CASE WHEN q.bad_purchase_rows = 0 THEN (SELECT sum(total - paid_amount) FROM purchases_base) END AS payables,
      CASE WHEN q.bad_inventory_rows = 0 THEN (SELECT sum(quantity * unit_cost) FROM inventory_base) END AS inventory_value,
      (SELECT count(*) FROM sales_base) AS invoice_count,
      q.bad_invoice_rows, q.bad_sale_item_rows, q.bad_purchase_rows, q.bad_inventory_rows
    FROM quality q
  ),
  trend AS (
    SELECT jsonb_agg(jsonb_build_object(
      'month', to_char(m.month_start, 'YYYY-MM'),
      'label', CASE EXTRACT(MONTH FROM m.month_start)::integer
        WHEN 1 THEN 'يناير' WHEN 2 THEN 'فبراير' WHEN 3 THEN 'مارس' WHEN 4 THEN 'أبريل'
        WHEN 5 THEN 'مايو' WHEN 6 THEN 'يونيو' WHEN 7 THEN 'يوليو' WHEN 8 THEN 'أغسطس'
        WHEN 9 THEN 'سبتمبر' WHEN 10 THEN 'أكتوبر' WHEN 11 THEN 'نوفمبر' ELSE 'ديسمبر' END,
      'sales', COALESCE(x.sales,0), 'cost', COALESCE(x.cost,0),
      'profit', COALESCE(x.sales,0)-COALESCE(x.cost,0), 'invoices', COALESCE(x.invoices,0)
    ) ORDER BY m.month_start) AS rows
    FROM generate_series(
      date_trunc('month', p_as_of::timestamp) - ((v_months-1) * interval '1 month'),
      date_trunc('month', p_as_of::timestamp), interval '1 month'
    ) m(month_start)
    LEFT JOIN LATERAL (
      SELECT sum(s.subtotal) AS sales,
             sum(si.quantity * si.cost_price) AS cost,
             count(DISTINCT s.id) AS invoices
      FROM sales_base s
      LEFT JOIN sale_items_base si ON si.invoice_id = s.id
      WHERE s.invoice_date >= m.month_start::date
        AND s.invoice_date < (m.month_start + interval '1 month')::date
        AND s.subtotal IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM sale_items_base bad WHERE bad.invoice_id=s.id AND (bad.quantity IS NULL OR bad.cost_price IS NULL))
    ) x ON true
  ),
  top_customers AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', q.customer_id, 'name', COALESCE(c.name, q.customer_id), 'value', q.value) ORDER BY q.value DESC), '[]'::jsonb) AS rows
    FROM (
      SELECT customer_id, sum(subtotal) AS value
      FROM sales_base
      WHERE customer_id IS NOT NULL AND subtotal IS NOT NULL
      GROUP BY customer_id
      ORDER BY value DESC
      LIMIT 10
    ) q
    LEFT JOIN public.customers c ON c.id=q.customer_id AND c.company_id=v_company_id
  ),
  top_products AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', q.product_id, 'name', COALESCE(p.name,q.product_id), 'value', q.value, 'secondary', q.qty) ORDER BY q.value DESC), '[]'::jsonb) AS rows
    FROM (
      SELECT product_id, sum(line_total) AS value, sum(quantity) AS qty
      FROM sale_items_base
      WHERE product_id IS NOT NULL AND line_total IS NOT NULL AND quantity IS NOT NULL
      GROUP BY product_id
      ORDER BY value DESC
      LIMIT 10
    ) q
    LEFT JOIN public.products p ON p.id=q.product_id AND p.company_id=v_company_id
  ),
  categories AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(c.name,'غير مصنف'), 'sales', q.sales, 'profit', q.profit, 'quantity', q.quantity) ORDER BY q.sales DESC), '[]'::jsonb) AS rows
    FROM (
      SELECT p.category_id, sum(si.line_total) AS sales,
             sum(si.line_total - (si.cost_price * si.quantity)) AS profit,
             sum(si.quantity) AS quantity
      FROM sale_items_base si
      LEFT JOIN public.products p ON p.id=si.product_id AND p.company_id=v_company_id
      WHERE si.line_total IS NOT NULL AND si.cost_price IS NOT NULL AND si.quantity IS NOT NULL
      GROUP BY p.category_id
    ) q
    LEFT JOIN public.categories c ON c.id=q.category_id AND c.company_id=v_company_id
  ),
  aging AS (
    SELECT jsonb_build_array(
      jsonb_build_object('bucket','0-30','amount',COALESCE(sum(CASE WHEN age_days BETWEEN 0 AND 30 THEN outstanding END),0),'count',count(*) FILTER (WHERE age_days BETWEEN 0 AND 30)),
      jsonb_build_object('bucket','31-60','amount',COALESCE(sum(CASE WHEN age_days BETWEEN 31 AND 60 THEN outstanding END),0),'count',count(*) FILTER (WHERE age_days BETWEEN 31 AND 60)),
      jsonb_build_object('bucket','61-90','amount',COALESCE(sum(CASE WHEN age_days BETWEEN 61 AND 90 THEN outstanding END),0),'count',count(*) FILTER (WHERE age_days BETWEEN 61 AND 90)),
      jsonb_build_object('bucket','90+','amount',COALESCE(sum(CASE WHEN age_days > 90 THEN outstanding END),0),'count',count(*) FILTER (WHERE age_days > 90)),
      jsonb_build_object('bucket','UNDATED','amount',COALESCE(sum(CASE WHEN due_date IS NULL THEN outstanding END),0),'count',count(*) FILTER (WHERE due_date IS NULL))
    ) AS rows
    FROM (
      SELECT due_date, total-paid_amount AS outstanding,
             CASE WHEN due_date IS NULL THEN NULL ELSE GREATEST(0, p_as_of-due_date) END AS age_days
      FROM sales_base
      WHERE total IS NOT NULL AND paid_amount IS NOT NULL AND total-paid_amount > 0
    ) a
  ),
  counts AS (
    SELECT
      (SELECT count(*) FROM public.customers WHERE company_id=v_company_id) AS total_customers,
      (SELECT count(*) FROM public.products WHERE company_id=v_company_id) AS total_products,
      (SELECT count(*) FROM public.products WHERE company_id=v_company_id AND is_active=true) AS active_products
  )
  SELECT jsonb_build_object(
    'status', CASE WHEN k.bad_invoice_rows=0 AND k.bad_sale_item_rows=0 AND k.bad_purchase_rows=0 AND k.bad_inventory_rows=0 AND (k.invoice_count > 0 OR k.total_cost IS NOT NULL OR k.inventory_value IS NOT NULL) THEN 'CALCULATED' ELSE 'INSUFFICIENT_DATA' END,
    'totalSales', k.total_sales,
    'totalCost', k.total_cost,
    'grossProfit', CASE WHEN k.total_sales IS NOT NULL AND k.total_cost IS NOT NULL THEN k.total_sales-k.total_cost END,
    'grossMargin', CASE WHEN k.total_sales IS NOT NULL AND k.total_cost IS NOT NULL AND k.total_sales <> 0 THEN ((k.total_sales-k.total_cost)/k.total_sales)*100 END,
    'totalReceivables', k.receivables,
    'overdueReceivables', k.overdue,
    'totalPayables', k.payables,
    'inventoryValue', k.inventory_value,
    'totalCustomers', counts.total_customers,
    'activeCustomers', NULL,
    'totalProducts', counts.total_products,
    'invoiceCount', k.invoice_count,
    'avgInvoiceValue', CASE WHEN k.invoice_count > 0 AND k.total_sales IS NOT NULL THEN k.total_sales/k.invoice_count END,
    'collectionRate', CASE WHEN k.total_sales IS NOT NULL AND k.invoice_count > 0 AND (SELECT sum(total) FROM sales_base) <> 0 THEN ((SELECT sum(paid_amount) FROM sales_base)/(SELECT sum(total) FROM sales_base))*100 END,
    'trend', (SELECT rows FROM trend),
    'topCustomers', (SELECT rows FROM top_customers),
    'topProducts', (SELECT rows FROM top_products),
    'categories', (SELECT rows FROM categories),
    'aging', (SELECT rows FROM aging),
    'asOf', p_as_of,
    'months', v_months,
    'quality', jsonb_build_object('badInvoiceRows',k.bad_invoice_rows,'badSaleItemRows',k.bad_sale_item_rows,'badPurchaseRows',k.bad_purchase_rows,'badInventoryRows',k.bad_inventory_rows)
  ) INTO v_result
  FROM kpis k CROSS JOIN counts;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_snapshot(integer,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot(integer,date) TO authenticated;
