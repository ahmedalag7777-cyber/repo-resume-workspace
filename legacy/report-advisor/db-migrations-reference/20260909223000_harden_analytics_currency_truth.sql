-- Forward-only reconciliation of the proven analytics currency boundary.
CREATE OR REPLACE FUNCTION public.get_profitability_snapshot(p_as_of date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE v_company_id uuid:=public.current_company_id(); v_currency text; v_result jsonb;
BEGIN
 IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
 SELECT c.currency INTO v_currency FROM public.companies c WHERE c.id=v_company_id;
 WITH sales_base AS (SELECT s.id,s.subtotal,s.total,s.paid_amount,s.currency FROM public.sales_invoices s WHERE s.company_id=v_company_id AND s.status IS NOT NULL AND s.status NOT IN ('cancelled','void') AND s.invoice_date<=p_as_of),
 items AS (SELECT si.invoice_id,si.quantity,si.cost_price,si.line_total FROM public.sale_items si JOIN sales_base s ON s.id=si.invoice_id),
 quality AS (SELECT count(*) FILTER(WHERE subtotal IS NULL OR total IS NULL OR paid_amount IS NULL) bad_invoice_rows,(SELECT count(*) FROM items WHERE quantity IS NULL OR cost_price IS NULL OR line_total IS NULL) bad_sale_item_rows,(SELECT count(*) FROM sales_base WHERE currency IS NOT NULL AND v_currency IS NOT NULL AND currency<>v_currency) currency_mismatch_rows FROM sales_base),
 totals AS (SELECT coalesce(sum(s.subtotal) FILTER(WHERE s.subtotal IS NOT NULL),0)::numeric revenue,coalesce((SELECT sum(i.quantity*i.cost_price) FROM items i WHERE i.quantity IS NOT NULL AND i.cost_price IS NOT NULL),0)::numeric cost,count(*)::integer invoice_count FROM sales_base s)
 SELECT jsonb_build_object('status',CASE WHEN q.bad_invoice_rows=0 AND q.bad_sale_item_rows=0 AND q.currency_mismatch_rows=0 AND t.invoice_count>0 THEN 'CALCULATED' ELSE 'INSUFFICIENT_DATA' END,'currency',v_currency,'currency_status',CASE WHEN q.currency_mismatch_rows=0 AND v_currency IS NOT NULL THEN 'CONSISTENT' ELSE 'INSUFFICIENT_DATA' END,'revenue',CASE WHEN q.bad_invoice_rows=0 AND q.currency_mismatch_rows=0 THEN t.revenue END,'cost',CASE WHEN q.bad_sale_item_rows=0 AND q.currency_mismatch_rows=0 THEN t.cost END,'gross_profit',CASE WHEN q.bad_invoice_rows=0 AND q.bad_sale_item_rows=0 AND q.currency_mismatch_rows=0 THEN t.revenue-t.cost END,'gross_margin',CASE WHEN q.bad_invoice_rows=0 AND q.bad_sale_item_rows=0 AND q.currency_mismatch_rows=0 AND t.revenue<>0 THEN ((t.revenue-t.cost)/t.revenue)*100 END,'invoice_count',t.invoice_count,'bad_invoice_rows',q.bad_invoice_rows,'bad_sale_item_rows',q.bad_sale_item_rows,'currency_mismatch_rows',q.currency_mismatch_rows,'reasons',CASE WHEN q.bad_invoice_rows>0 OR q.bad_sale_item_rows>0 OR q.currency_mismatch_rows>0 OR t.invoice_count=0 THEN to_jsonb(array_remove(array[case when q.bad_invoice_rows>0 then 'INVOICE_DATA_QUALITY' end,case when q.bad_sale_item_rows>0 then 'SALE_ITEM_DATA_QUALITY' end,case when q.currency_mismatch_rows>0 then 'CURRENCY_MISMATCH' end,case when t.invoice_count=0 then 'NO_SALES_DATA' end],null)) ELSE '[]'::jsonb END,'as_of',p_as_of) INTO v_result FROM quality q CROSS JOIN totals t;
 RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.get_purchase_summary(p_company_id uuid,p_from date DEFAULT NULL,p_to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE v_company_id uuid:=public.current_company_id(); v_currency text; v_result jsonb; v_mismatch bigint;
BEGIN
 IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
 IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
 IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from>p_to THEN RAISE EXCEPTION 'REPORT_DATE_RANGE_INVALID'; END IF;
 SELECT c.currency INTO v_currency FROM public.companies c WHERE c.id=v_company_id;
 SELECT count(*) FILTER(WHERE pi.currency IS NOT NULL AND v_currency IS NOT NULL AND pi.currency<>v_currency) INTO v_mismatch FROM public.purchase_invoices pi WHERE pi.company_id=v_company_id AND pi.status NOT IN ('cancelled','void') AND (p_from IS NULL OR pi.invoice_date>=p_from) AND (p_to IS NULL OR pi.invoice_date<=p_to);
 SELECT jsonb_build_object('total',CASE WHEN v_mismatch=0 THEN coalesce(sum(pi.total),0) END,'count',count(*)::integer,'supplier_count',count(distinct pi.supplier_id)::integer,'average',CASE WHEN v_mismatch=0 AND count(*)>0 THEN sum(pi.total)/count(*) END,'as_of',coalesce(p_to,current_date),'data_status',CASE WHEN count(*)=0 THEN 'NO_DATA' WHEN v_mismatch>0 THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END,'currency',v_currency,'currency_status',CASE WHEN v_mismatch=0 AND v_currency IS NOT NULL THEN 'CONSISTENT' ELSE 'INSUFFICIENT_DATA' END,'currency_mismatch_rows',v_mismatch) INTO v_result FROM public.purchase_invoices pi WHERE pi.company_id=v_company_id AND pi.status NOT IN ('cancelled','void') AND (p_from IS NULL OR pi.invoice_date>=p_from) AND (p_to IS NULL OR pi.invoice_date<=p_to);
 RETURN v_result;
END; $$;

REVOKE ALL ON FUNCTION public.get_profitability_snapshot(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_purchase_summary(uuid,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profitability_snapshot(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_purchase_summary(uuid,date,date) TO authenticated;
