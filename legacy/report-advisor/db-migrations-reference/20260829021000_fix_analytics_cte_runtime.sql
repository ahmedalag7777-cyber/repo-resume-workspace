-- Follow-up correction for analytics CTE scope discovered by authenticated runtime smoke test.
-- Keeps the canonical contracts; only makes the CTEs visible to the final projection.

CREATE OR REPLACE FUNCTION public.get_rfm_snapshot(p_as_of date DEFAULT CURRENT_DATE,p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE v_company_id uuid:=public.current_company_id(); v_limit integer:=LEAST(GREATEST(COALESCE(p_limit,500),1),500); v_unknown bigint; v_rows jsonb; v_status text;
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
 SELECT
   (SELECT count(*) FILTER(WHERE customer_id IS NULL OR customer_name IS NULL OR invoice_date IS NULL OR total IS NULL) FROM raw),
   coalesce((SELECT jsonb_agg(to_jsonb(fr)) FROM final_rows fr),'[]'::jsonb),
   CASE WHEN NOT EXISTS(SELECT 1 FROM valid) THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END
 INTO v_unknown,v_rows,v_status;
 RETURN jsonb_build_object('asOf',p_as_of,'rows',v_rows,'unknownRows',v_unknown,'status',v_status);
END; $$;

CREATE OR REPLACE FUNCTION public.get_abc_snapshot(p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE v_company_id uuid:=public.current_company_id(); v_limit integer:=LEAST(GREATEST(COALESCE(p_limit,500),1),500); v_unknown bigint; v_rows jsonb; v_total numeric; v_status text;
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
   SELECT product_id,product_name,revenue,cumulative,
     CASE WHEN total_revenue=0 THEN NULL ELSE cumulative/total_revenue*100 END cumulative_pct,
     CASE WHEN total_revenue=0 THEN NULL WHEN cumulative/total_revenue*100<=80 THEN 'A' WHEN cumulative/total_revenue*100<=95 THEN 'B' ELSE 'C' END class
   FROM ranked ORDER BY revenue DESC,product_id LIMIT v_limit
 )
 SELECT
   (SELECT count(*) FILTER(WHERE product_id IS NULL OR product_name IS NULL OR line_total IS NULL) FROM raw),
   coalesce((SELECT jsonb_agg(to_jsonb(fr)) FROM final_rows fr),'[]'::jsonb),
   coalesce((SELECT sum(revenue) FROM agg),0),
   CASE WHEN coalesce((SELECT sum(revenue) FROM agg),0)<=0 OR NOT EXISTS(SELECT 1 FROM valid) THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END
 INTO v_unknown,v_rows,v_total,v_status;
 RETURN jsonb_build_object('rows',v_rows,'totalRevenue',v_total,'unknownRows',v_unknown,'status',v_status);
END; $$;

CREATE OR REPLACE FUNCTION public.get_aging_snapshot(p_as_of date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE v_company_id uuid:=public.current_company_id(); v_unknown bigint; v_rows jsonb; v_status text;
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
 SELECT
   (SELECT count(*) FROM classified WHERE unknown=1),
   coalesce((SELECT jsonb_agg(jsonb_build_object('name',bucket,'amount',amount,'count',count)
     ORDER BY CASE bucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 WHEN '90+' THEN 4 ELSE 5 END) FROM agg),'[]'::jsonb),
   CASE WHEN NOT EXISTS(SELECT 1 FROM raw) THEN 'NO_DATA'
        WHEN (SELECT count(*) FROM classified WHERE unknown=1)>0 THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END
 INTO v_unknown,v_rows,v_status;
 RETURN jsonb_build_object('asOf',p_as_of,'rows',v_rows,'unknownRows',v_unknown,'status',v_status);
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_rfm_snapshot(date,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_abc_snapshot(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_aging_snapshot(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rfm_snapshot(date,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_abc_snapshot(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_aging_snapshot(date) TO authenticated;
