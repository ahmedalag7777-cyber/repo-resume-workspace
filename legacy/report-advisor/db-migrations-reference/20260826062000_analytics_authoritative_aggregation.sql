-- Analytics truth: RFM, ABC and aging are server-authoritative and tenant-derived.
-- Client pages must never fetch complete transactional histories to calculate these metrics.

CREATE OR REPLACE FUNCTION public.get_rfm_snapshot(p_as_of date DEFAULT CURRENT_DATE,p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE v_company_id uuid := public.current_company_id(); v_limit integer := LEAST(GREATEST(COALESCE(p_limit,500),1),500); v_unknown bigint; v_rows jsonb;
BEGIN
 IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
 WITH raw AS (SELECT si.customer_id,c.name AS customer_name,si.invoice_date,si.total FROM public.sales_invoices si LEFT JOIN public.customers c ON c.id=si.customer_id AND c.company_id=v_company_id WHERE si.company_id=v_company_id AND si.status NOT IN ('cancelled','void')),
 valid AS (SELECT customer_id,customer_name,invoice_date,total FROM raw WHERE customer_id IS NOT NULL AND customer_name IS NOT NULL AND invoice_date IS NOT NULL AND total IS NOT NULL),
 agg AS (SELECT customer_id,max(customer_name) AS customer_name,(p_as_of-max(invoice_date::date))::integer AS recency,count(*)::integer AS frequency,sum(total)::numeric AS monetary FROM valid GROUP BY customer_id),
 scored AS (SELECT a.*,least(5,floor((row_number() OVER (ORDER BY recency ASC,customer_id)-1)::numeric/greatest(count(*) OVER (),1)*5)::integer+1) AS r_score,least(5,floor((row_number() OVER (ORDER BY frequency DESC,customer_id)-1)::numeric/greatest(count(*) OVER (),1)*5)::integer+1) AS f_score,least(5,floor((row_number() OVER (ORDER BY monetary DESC,customer_id)-1)::numeric/greatest(count(*) OVER (),1)*5)::integer+1) AS m_score FROM agg a),
 final AS (SELECT customer_id,customer_name,recency,frequency,monetary,r_score,f_score,m_score,CASE WHEN r_score+f_score+m_score>=13 THEN 'أبطال' WHEN r_score+f_score+m_score>=10 THEN 'مخلصون' WHEN r_score+f_score+m_score>=7 THEN 'واعدون' WHEN r_score+f_score+m_score>=4 THEN 'معرضون للخطر' ELSE 'خاملون' END AS rfm_segment FROM scored ORDER BY (r_score+f_score+m_score) DESC,monetary DESC,customer_id LIMIT v_limit)
 SELECT count(*) FILTER (WHERE customer_id IS NULL OR customer_name IS NULL OR invoice_date IS NULL OR total IS NULL) INTO v_unknown FROM raw;
 SELECT COALESCE(jsonb_agg(to_jsonb(final)),'[]'::jsonb) INTO v_rows FROM final;
 RETURN jsonb_build_object('asOf',p_as_of,'rows',v_rows,'unknownRows',v_unknown,'status',CASE WHEN NOT EXISTS(SELECT 1 FROM valid) THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END);
END; $$;

CREATE OR REPLACE FUNCTION public.get_abc_snapshot(p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE v_company_id uuid := public.current_company_id(); v_limit integer := LEAST(GREATEST(COALESCE(p_limit,500),1),500); v_unknown bigint; v_rows jsonb; v_total numeric;
BEGIN
 IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
 WITH raw AS (SELECT item.product_id,item.line_total,p.name AS product_name FROM public.sale_items item JOIN public.sales_invoices si ON si.id=item.invoice_id AND si.company_id=v_company_id LEFT JOIN public.products p ON p.id=item.product_id AND p.company_id=v_company_id WHERE item.company_id=v_company_id AND si.status NOT IN ('cancelled','void')),
 valid AS (SELECT product_id,product_name,line_total FROM raw WHERE product_id IS NOT NULL AND product_name IS NOT NULL AND line_total IS NOT NULL),
 agg AS (SELECT product_id,max(product_name) AS product_name,sum(line_total)::numeric AS revenue FROM valid GROUP BY product_id),
 ranked AS (SELECT a.*,sum(revenue) OVER (ORDER BY revenue DESC,product_id ROWS UNBOUNDED PRECEDING) AS cumulative,sum(revenue) OVER () AS total_revenue FROM agg a),
 final AS (SELECT product_id,product_name,revenue,cumulative,CASE WHEN total_revenue=0 THEN NULL ELSE cumulative/total_revenue*100 END AS cumulative_pct,CASE WHEN total_revenue=0 THEN NULL WHEN cumulative/total_revenue*100<=80 THEN 'A' WHEN cumulative/total_revenue*100<=95 THEN 'B' ELSE 'C' END AS class FROM ranked ORDER BY revenue DESC,product_id LIMIT v_limit)
 SELECT count(*) FILTER (WHERE product_id IS NULL OR product_name IS NULL OR line_total IS NULL) INTO v_unknown FROM raw;
 SELECT COALESCE(sum(revenue),0) INTO v_total FROM agg;
 SELECT COALESCE(jsonb_agg(to_jsonb(final)),'[]'::jsonb) INTO v_rows FROM final;
 RETURN jsonb_build_object('rows',v_rows,'totalRevenue',v_total,'unknownRows',v_unknown,'status',CASE WHEN v_total<=0 OR NOT EXISTS(SELECT 1 FROM valid) THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END);
END; $$;

CREATE OR REPLACE FUNCTION public.get_aging_snapshot(p_as_of date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE v_company_id uuid := public.current_company_id(); v_unknown bigint; v_rows jsonb;
BEGIN
 IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
 WITH raw AS (SELECT si.total,si.paid_amount,si.due_date,si.invoice_date FROM public.sales_invoices si WHERE si.company_id=v_company_id AND si.status NOT IN ('cancelled','void')),
 classified AS (SELECT CASE WHEN due_date IS NULL AND invoice_date IS NULL THEN 'UNDATED' WHEN (COALESCE(due_date,invoice_date))::date>p_as_of THEN '0-30' WHEN p_as_of-(COALESCE(due_date,invoice_date))::date<=30 THEN '0-30' WHEN p_as_of-(COALESCE(due_date,invoice_date))::date<=60 THEN '31-60' WHEN p_as_of-(COALESCE(due_date,invoice_date))::date<=90 THEN '61-90' ELSE '90+' END AS bucket,CASE WHEN total IS NULL OR paid_amount IS NULL THEN NULL ELSE total-paid_amount END AS outstanding,CASE WHEN total IS NULL OR paid_amount IS NULL OR (due_date IS NULL AND invoice_date IS NULL) THEN 1 ELSE 0 END AS unknown FROM raw),
 agg AS (SELECT bucket,COALESCE(sum(outstanding),0) AS amount,count(*) FILTER (WHERE outstanding IS NOT NULL AND outstanding>0) AS count FROM classified WHERE outstanding IS NULL OR outstanding>0 GROUP BY bucket)
 SELECT count(*) FILTER (WHERE unknown=1) INTO v_unknown FROM classified;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('name',bucket,'amount',amount,'count',count) ORDER BY CASE bucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 WHEN '90+' THEN 4 ELSE 5 END),'[]'::jsonb) INTO v_rows FROM agg;
 RETURN jsonb_build_object('asOf',p_as_of,'rows',v_rows,'unknownRows',v_unknown,'status',CASE WHEN NOT EXISTS(SELECT 1 FROM classified) THEN 'NO_DATA' WHEN v_unknown>0 THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END);
END; $$;

REVOKE ALL ON FUNCTION public.get_rfm_snapshot(date,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_abc_snapshot(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_aging_snapshot(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rfm_snapshot(date,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_abc_snapshot(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_aging_snapshot(date) TO authenticated;
