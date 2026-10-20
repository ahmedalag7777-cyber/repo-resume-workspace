-- Runtime reconciliation correction for canonical analytics/dashboard RPCs.
-- Source contracts: 20260826052000, 20260826062000, 20260826070000,
-- 20260826073000, 20260826080000.
-- Fixes only proven runtime defects discovered by authenticated DB smoke tests:
-- dashboard UUID/text COALESCE type errors; analytics CTE scope errors;
-- sale_items has no company_id column; and explicit anon EXECUTE revocation.
-- No business semantics or tenant authority are broadened.

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot(
  p_months integer DEFAULT 6,
  p_as_of date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_months integer := LEAST(GREATEST(COALESCE(p_months, 6), 1), 24);
  v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;

  WITH
  sales_base AS (
    SELECT s.id, s.customer_id, s.subtotal, s.total, s.paid_amount, s.invoice_date, s.due_date
    FROM public.sales_invoices s
    WHERE s.company_id = v_company_id
      AND s.status IS NOT NULL AND s.status NOT IN ('cancelled','void')
      AND s.invoice_date <= p_as_of
  ),
  sale_items_base AS (
    SELECT si.invoice_id, si.product_id, si.quantity, si.line_total, si.cost_price
    FROM public.sale_items si JOIN sales_base s ON s.id = si.invoice_id
  ),
  purchases_base AS (
    SELECT p.total, p.paid_amount FROM public.purchase_invoices p
    WHERE p.company_id=v_company_id AND p.status IS NOT NULL
      AND p.status NOT IN ('cancelled','void') AND p.invoice_date <= p_as_of
  ),
  inventory_base AS (
    SELECT ib.quantity, ib.unit_cost, ib.product_id FROM public.inventory_balances ib
    WHERE ib.company_id=v_company_id
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
      CASE WHEN q.bad_invoice_rows=0 THEN (SELECT sum(subtotal) FROM sales_base) END total_sales,
      CASE WHEN q.bad_sale_item_rows=0 THEN (SELECT sum(quantity*cost_price) FROM sale_items_base) END total_cost,
      CASE WHEN q.bad_invoice_rows=0 THEN (SELECT sum(total-paid_amount) FROM sales_base) END receivables,
      CASE WHEN q.bad_invoice_rows=0 THEN (SELECT sum(CASE WHEN due_date IS NOT NULL AND due_date<p_as_of AND paid_amount<total THEN total-paid_amount ELSE 0 END) FROM sales_base) END overdue,
      CASE WHEN q.bad_purchase_rows=0 THEN (SELECT sum(total-paid_amount) FROM purchases_base) END payables,
      CASE WHEN q.bad_inventory_rows=0 THEN (SELECT sum(quantity*unit_cost) FROM inventory_base) END inventory_value,
      (SELECT count(*) FROM sales_base) invoice_count,
      q.bad_invoice_rows,q.bad_sale_item_rows,q.bad_purchase_rows,q.bad_inventory_rows
    FROM quality q
  ),
  trend AS (
    SELECT jsonb_agg(jsonb_build_object(
      'month',to_char(m.month_start,'YYYY-MM'),
      'label',CASE EXTRACT(MONTH FROM m.month_start)::integer
        WHEN 1 THEN 'يناير' WHEN 2 THEN 'فبراير' WHEN 3 THEN 'مارس' WHEN 4 THEN 'أبريل'
        WHEN 5 THEN 'مايو' WHEN 6 THEN 'يونيو' WHEN 7 THEN 'يوليو' WHEN 8 THEN 'أغسطس'
        WHEN 9 THEN 'سبتمبر' WHEN 10 THEN 'أكتوبر' WHEN 11 THEN 'نوفمبر' ELSE 'ديسمبر' END,
      'sales',COALESCE(x.sales,0),'cost',COALESCE(x.cost,0),
      'profit',COALESCE(x.sales,0)-COALESCE(x.cost,0),'invoices',COALESCE(x.invoices,0)
    ) ORDER BY m.month_start) rows
    FROM generate_series(date_trunc('month',p_as_of::timestamp)-((v_months-1)*interval '1 month'),
                         date_trunc('month',p_as_of::timestamp),interval '1 month') m(month_start)
    LEFT JOIN LATERAL (
      SELECT sum(s.subtotal) sales,sum(si.quantity*si.cost_price) cost,count(DISTINCT s.id) invoices
      FROM sales_base s LEFT JOIN sale_items_base si ON si.invoice_id=s.id
      WHERE s.invoice_date>=m.month_start::date
        AND s.invoice_date<(m.month_start+interval '1 month')::date
        AND s.subtotal IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM sale_items_base bad WHERE bad.invoice_id=s.id AND (bad.quantity IS NULL OR bad.cost_price IS NULL))
    ) x ON true
  ),
  top_customers AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',q.customer_id,'name',COALESCE(c.name,q.customer_id::text),'value',q.value) ORDER BY q.value DESC),'[]'::jsonb) rows
    FROM (SELECT customer_id,sum(subtotal) value FROM sales_base WHERE customer_id IS NOT NULL AND subtotal IS NOT NULL GROUP BY customer_id ORDER BY value DESC LIMIT 10) q
    LEFT JOIN public.customers c ON c.id=q.customer_id AND c.company_id=v_company_id
  ),
  top_products AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',q.product_id,'name',COALESCE(p.name,q.product_id::text),'value',q.value,'secondary',q.qty) ORDER BY q.value DESC),'[]'::jsonb) rows
    FROM (SELECT product_id,sum(line_total) value,sum(quantity) qty FROM sale_items_base WHERE product_id IS NOT NULL AND line_total IS NOT NULL AND quantity IS NOT NULL GROUP BY product_id ORDER BY value DESC LIMIT 10) q
    LEFT JOIN public.products p ON p.id=q.product_id AND p.company_id=v_company_id
  ),
  categories AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name',COALESCE(c.name,'غير مصنف'),'sales',q.sales,'profit',q.profit,'quantity',q.quantity) ORDER BY q.sales DESC),'[]'::jsonb) rows
    FROM (
      SELECT p.category_id,sum(si.line_total) sales,sum(si.line_total-(si.cost_price*si.quantity)) profit,sum(si.quantity) quantity
      FROM sale_items_base si LEFT JOIN public.products p ON p.id=si.product_id AND p.company_id=v_company_id
      WHERE si.line_total IS NOT NULL AND si.cost_price IS NOT NULL AND si.quantity IS NOT NULL
      GROUP BY p.category_id
    ) q LEFT JOIN public.categories c ON c.id=q.category_id AND c.company_id=v_company_id
  ),
  aging AS (
    SELECT jsonb_build_array(
      jsonb_build_object('bucket','0-30','amount',COALESCE(sum(CASE WHEN age_days BETWEEN 0 AND 30 THEN outstanding END),0),'count',count(*) FILTER(WHERE age_days BETWEEN 0 AND 30)),
      jsonb_build_object('bucket','31-60','amount',COALESCE(sum(CASE WHEN age_days BETWEEN 31 AND 60 THEN outstanding END),0),'count',count(*) FILTER(WHERE age_days BETWEEN 31 AND 60)),
      jsonb_build_object('bucket','61-90','amount',COALESCE(sum(CASE WHEN age_days BETWEEN 61 AND 90 THEN outstanding END),0),'count',count(*) FILTER(WHERE age_days BETWEEN 61 AND 90)),
      jsonb_build_object('bucket','90+','amount',COALESCE(sum(CASE WHEN age_days > 90 THEN outstanding END),0),'count',count(*) FILTER(WHERE age_days > 90)),
      jsonb_build_object('bucket','UNDATED','amount',COALESCE(sum(CASE WHEN due_date IS NULL THEN outstanding END),0),'count',count(*) FILTER(WHERE due_date IS NULL))
    ) rows
    FROM (SELECT due_date,total-paid_amount outstanding,CASE WHEN due_date IS NULL THEN NULL ELSE GREATEST(0,p_as_of-due_date) END age_days
          FROM sales_base WHERE total IS NOT NULL AND paid_amount IS NOT NULL AND total-paid_amount>0) a
  ),
  counts AS (
    SELECT (SELECT count(*) FROM public.customers WHERE company_id=v_company_id) total_customers,
           (SELECT count(*) FROM public.products WHERE company_id=v_company_id) total_products
  )
  SELECT jsonb_build_object(
    'status',CASE WHEN k.bad_invoice_rows=0 AND k.bad_sale_item_rows=0 AND k.bad_purchase_rows=0 AND k.bad_inventory_rows=0
                       AND (k.invoice_count>0 OR k.total_cost IS NOT NULL OR k.inventory_value IS NOT NULL) THEN 'CALCULATED' ELSE 'INSUFFICIENT_DATA' END,
    'totalSales',k.total_sales,'totalCost',k.total_cost,
    'grossProfit',CASE WHEN k.total_sales IS NOT NULL AND k.total_cost IS NOT NULL THEN k.total_sales-k.total_cost END,
    'grossMargin',CASE WHEN k.total_sales IS NOT NULL AND k.total_cost IS NOT NULL AND k.total_sales<>0 THEN ((k.total_sales-k.total_cost)/k.total_sales)*100 END,
    'totalReceivables',k.receivables,'overdueReceivables',k.overdue,'totalPayables',k.payables,'inventoryValue',k.inventory_value,
    'totalCustomers',counts.total_customers,'activeCustomers',NULL,'totalProducts',counts.total_products,'invoiceCount',k.invoice_count,
    'avgInvoiceValue',CASE WHEN k.invoice_count>0 AND k.total_sales IS NOT NULL THEN k.total_sales/k.invoice_count END,
    'collectionRate',CASE WHEN k.total_sales IS NOT NULL AND k.invoice_count>0 AND (SELECT sum(total) FROM sales_base)<>0 THEN ((SELECT sum(paid_amount) FROM sales_base)/(SELECT sum(total) FROM sales_base))*100 END,
    'trend',(SELECT rows FROM trend),'topCustomers',(SELECT rows FROM top_customers),'topProducts',(SELECT rows FROM top_products),
    'categories',(SELECT rows FROM categories),'aging',(SELECT rows FROM aging),'asOf',p_as_of,'months',v_months,
    'quality',jsonb_build_object('badInvoiceRows',k.bad_invoice_rows,'badSaleItemRows',k.bad_sale_item_rows,'badPurchaseRows',k.bad_purchase_rows,'badInventoryRows',k.bad_inventory_rows)
  ) INTO v_result FROM kpis k CROSS JOIN counts;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rfm_snapshot(p_as_of date DEFAULT CURRENT_DATE,p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE v_company_id uuid:=public.current_company_id(); v_limit integer:=LEAST(GREATEST(COALESCE(p_limit,500),1),500); v_unknown bigint; v_rows jsonb;
BEGIN
 IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
 WITH raw AS (
   SELECT si.customer_id,c.name customer_name,si.invoice_date,si.total
   FROM public.sales_invoices si LEFT JOIN public.customers c ON c.id=si.customer_id AND c.company_id=v_company_id
   WHERE si.company_id=v_company_id AND si.status NOT IN ('cancelled','void')
 ), valid AS (
   SELECT * FROM raw WHERE customer_id IS NOT NULL AND customer_name IS NOT NULL AND invoice_date IS NOT NULL AND total IS NOT NULL
 ), agg AS (
   SELECT customer_id,max(customer_name) customer_name,(p_as_of-max(invoice_date::date))::integer recency,count(*)::integer frequency,sum(total)::numeric monetary
   FROM valid GROUP BY customer_id
 ), scored AS (
   SELECT a.*,
     least(5,floor((row_number() over(order by recency asc,customer_id)-1)::numeric/greatest(count(*) over(),1)*5)::integer+1) r_score,
     least(5,floor((row_number() over(order by frequency desc,customer_id)-1)::numeric/greatest(count(*) over(),1)*5)::integer+1) f_score,
     least(5,floor((row_number() over(order by monetary desc,customer_id)-1)::numeric/greatest(count(*) over(),1)*5)::integer+1) m_score
   FROM agg a
 ), final_rows AS (
   SELECT customer_id,customer_name,recency,frequency,monetary,r_score,f_score,m_score,
     CASE WHEN r_score+f_score+m_score>=13 THEN 'أبطال' WHEN r_score+f_score+m_score>=10 THEN 'مخلصون'
          WHEN r_score+f_score+m_score>=7 THEN 'واعدون' WHEN r_score+f_score+m_score>=4 THEN 'معرضون للخطر' ELSE 'خاملون' END rfm_segment
   FROM scored ORDER BY (r_score+f_score+m_score) DESC,monetary DESC,customer_id LIMIT v_limit
 )
 SELECT count(*) FILTER(WHERE customer_id IS NULL OR customer_name IS NULL OR invoice_date IS NULL OR total IS NULL),coalesce((SELECT jsonb_agg(to_jsonb(fr)) FROM final_rows),'[]'::jsonb)
 INTO v_unknown,v_rows FROM raw;
 RETURN jsonb_build_object('asOf',p_as_of,'rows',v_rows,'unknownRows',v_unknown,'status',CASE WHEN NOT EXISTS(SELECT 1 FROM valid) THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END);
END; $$;

CREATE OR REPLACE FUNCTION public.get_abc_snapshot(p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE v_company_id uuid:=public.current_company_id(); v_limit integer:=LEAST(GREATEST(COALESCE(p_limit,500),1),500); v_unknown bigint; v_rows jsonb; v_total numeric;
BEGIN
 IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
 WITH raw AS (
   SELECT item.product_id,item.line_total,p.name product_name
   FROM public.sale_items item
   JOIN public.sales_invoices si ON si.id=item.invoice_id AND si.company_id=v_company_id
   LEFT JOIN public.products p ON p.id=item.product_id AND p.company_id=v_company_id
   WHERE si.status NOT IN ('cancelled','void')
 ), valid AS (
   SELECT * FROM raw WHERE product_id IS NOT NULL AND product_name IS NOT NULL AND line_total IS NOT NULL
 ), agg AS (
   SELECT product_id,max(product_name) product_name,sum(line_total)::numeric revenue FROM valid GROUP BY product_id
 ), ranked AS (
   SELECT a.*,sum(revenue) over(order by revenue desc,product_id rows unbounded preceding) cumulative,sum(revenue) over() total_revenue FROM agg a
 ), final_rows AS (
   SELECT product_id,product_name,revenue,cumulative,CASE WHEN total_revenue=0 THEN NULL ELSE cumulative/total_revenue*100 END cumulative_pct,
     CASE WHEN total_revenue=0 THEN NULL WHEN cumulative/total_revenue*100<=80 THEN 'A' WHEN cumulative/total_revenue*100<=95 THEN 'B' ELSE 'C' END class
   FROM ranked ORDER BY revenue DESC,product_id LIMIT v_limit
 )
 SELECT count(*) FILTER(WHERE product_id IS NULL OR product_name IS NULL OR line_total IS NULL),
        coalesce((SELECT jsonb_agg(to_jsonb(fr)) FROM final_rows),'[]'::jsonb),
        coalesce((SELECT sum(revenue) FROM agg),0)
 INTO v_unknown,v_rows,v_total FROM raw;
 RETURN jsonb_build_object('rows',v_rows,'totalRevenue',v_total,'unknownRows',v_unknown,'status',CASE WHEN v_total<=0 OR NOT EXISTS(SELECT 1 FROM valid) THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END);
END; $$;

CREATE OR REPLACE FUNCTION public.get_aging_snapshot(p_as_of date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE v_company_id uuid:=public.current_company_id(); v_unknown bigint; v_rows jsonb;
BEGIN
 IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
 WITH raw AS (
   SELECT si.total,si.paid_amount,si.due_date,si.invoice_date
   FROM public.sales_invoices si
   WHERE si.company_id=v_company_id AND si.status NOT IN ('cancelled','void')
 ), classified AS (
   SELECT CASE WHEN due_date IS NULL AND invoice_date IS NULL THEN 'UNDATED'
               WHEN COALESCE(due_date,invoice_date)::date>p_as_of THEN '0-30'
               WHEN p_as_of-COALESCE(due_date,invoice_date)::date<=30 THEN '0-30'
               WHEN p_as_of-COALESCE(due_date,invoice_date)::date<=60 THEN '31-60'
               WHEN p_as_of-COALESCE(due_date,invoice_date)::date<=90 THEN '61-90' ELSE '90+' END bucket,
          CASE WHEN total IS NULL OR paid_amount IS NULL THEN NULL ELSE total-paid_amount END outstanding,
          CASE WHEN total IS NULL OR paid_amount IS NULL OR (due_date IS NULL AND invoice_date IS NULL) THEN 1 ELSE 0 END unknown
   FROM raw
 ), agg AS (
   SELECT bucket,coalesce(sum(outstanding),0) amount,count(*) FILTER(WHERE outstanding IS NOT NULL AND outstanding>0) count
   FROM classified WHERE outstanding IS NULL OR outstanding>0 GROUP BY bucket
 )
 SELECT count(*) FILTER(WHERE unknown=1),
        coalesce((SELECT jsonb_agg(jsonb_build_object('name',bucket,'amount',amount,'count',count)
                    ORDER BY CASE bucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 WHEN '90+' THEN 4 ELSE 5 END) FROM agg),'[]'::jsonb)
 INTO v_unknown,v_rows FROM classified;
 RETURN jsonb_build_object('asOf',p_as_of,'rows',v_rows,'unknownRows',v_unknown,
   'status',CASE WHEN NOT EXISTS(SELECT 1 FROM raw) THEN 'NO_DATA' WHEN v_unknown>0 THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END);
END; $$;

-- New public functions on this legacy project inherit broad EXECUTE defaults.
-- Keep the Data API surface authenticated-only for tenant-authoritative analytics.
REVOKE EXECUTE ON FUNCTION public.get_dashboard_snapshot(integer,date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_intelligence(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_sales_secondary_metrics(uuid,integer,integer,date,date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_purchase_summary(uuid,date,date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_inventory_valuation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_inventory_report_snapshot(integer,integer,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_rfm_snapshot(date,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_abc_snapshot(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_aging_snapshot(date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_data_quality_snapshot() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_forecast_snapshot(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_sales_export_rows(uuid,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_purchase_export_rows(uuid,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_inventory_export_rows(uuid,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_receivables_export_rows(uuid,integer) FROM PUBLIC, anon;

ALTER FUNCTION public.get_sales_secondary_metrics(uuid,integer,integer,date,date) SET search_path=public;
ALTER FUNCTION public.get_purchase_summary(uuid,date,date) SET search_path=public;
ALTER FUNCTION public.get_inventory_valuation(uuid) SET search_path=public;
ALTER FUNCTION public.get_inventory_report_snapshot(integer,integer,text) SET search_path=public;
ALTER FUNCTION public.get_dashboard_intelligence(integer) SET search_path=public;
ALTER FUNCTION public.get_forecast_snapshot(integer) SET search_path=public;
ALTER FUNCTION public.get_sales_export_rows(uuid,integer) SET search_path=public;
ALTER FUNCTION public.get_purchase_export_rows(uuid,integer) SET search_path=public;
ALTER FUNCTION public.get_inventory_export_rows(uuid,integer) SET search_path=public;
ALTER FUNCTION public.get_receivables_export_rows(uuid,integer) SET search_path=public;
ALTER FUNCTION public.get_data_quality_snapshot() SET search_path=public;

GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot(integer,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_intelligence(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_secondary_metrics(uuid,integer,integer,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_purchase_summary(uuid,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_valuation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_report_snapshot(integer,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rfm_snapshot(date,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_abc_snapshot(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_aging_snapshot(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_data_quality_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_forecast_snapshot(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_export_rows(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_purchase_export_rows(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_export_rows(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_receivables_export_rows(uuid,integer) TO authenticated;
