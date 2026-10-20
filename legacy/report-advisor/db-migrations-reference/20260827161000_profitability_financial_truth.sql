CREATE OR REPLACE FUNCTION public.get_profitability_snapshot(p_as_of date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_currency text;
  v_revenue numeric;
  v_cost numeric;
  v_rows integer := 0;
  v_bad_invoices integer := 0;
  v_bad_items integer := 0;
  v_currency_mismatch integer := 0;
  v_status text;
  v_reasons jsonb := '[]'::jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT currency INTO v_currency FROM public.companies WHERE id = v_company_id;
  IF v_currency IS NULL THEN v_reasons := v_reasons || jsonb_build_array('COMPANY_CURRENCY_MISSING'); END IF;
  SELECT count(*)::integer,
         count(*) FILTER (WHERE subtotal IS NULL OR total IS NULL OR tax_amount IS NULL OR currency IS NULL)::integer,
         count(*) FILTER (WHERE currency IS NOT NULL AND v_currency IS NOT NULL AND currency <> v_currency)::integer
    INTO v_rows, v_bad_invoices, v_currency_mismatch
    FROM public.sales_invoices s
   WHERE s.company_id = v_company_id AND s.status NOT IN ('cancelled','void') AND s.invoice_date <= p_as_of;
  SELECT count(*) FILTER (WHERE si.quantity IS NULL OR si.cost_price IS NULL OR si.line_total IS NULL)::integer
    INTO v_bad_items
    FROM public.sale_items si JOIN public.sales_invoices s ON s.id = si.invoice_id
   WHERE s.company_id = v_company_id AND s.status NOT IN ('cancelled','void') AND s.invoice_date <= p_as_of;
  IF v_bad_invoices > 0 THEN v_reasons := v_reasons || jsonb_build_array('MISSING_INVOICE_FINANCIAL_EVIDENCE'); END IF;
  IF v_bad_items > 0 THEN v_reasons := v_reasons || jsonb_build_array('MISSING_COST_EVIDENCE'); END IF;
  IF v_currency_mismatch > 0 THEN v_reasons := v_reasons || jsonb_build_array('CURRENCY_MISMATCH'); END IF;
  IF v_rows = 0 THEN v_status := 'INSUFFICIENT_DATA'; v_reasons := v_reasons || jsonb_build_array('NO_SALES_EVIDENCE');
  ELSIF jsonb_array_length(v_reasons) = 0 THEN
    SELECT sum(s.total - s.tax_amount), coalesce((SELECT sum(si.quantity * si.cost_price) FROM public.sale_items si WHERE si.invoice_id = s.id), 0)
      INTO v_revenue, v_cost
      FROM public.sales_invoices s
     WHERE s.company_id = v_company_id AND s.status NOT IN ('cancelled','void') AND s.invoice_date <= p_as_of;
    v_status := 'CALCULATED';
  ELSE v_status := 'INSUFFICIENT_DATA'; END IF;
  RETURN jsonb_build_object('status',v_status,'currency',v_currency,'currency_status',CASE WHEN v_currency_mismatch=0 AND v_currency IS NOT NULL THEN 'CONSISTENT' ELSE 'INSUFFICIENT_DATA' END,'revenue',v_revenue,'cost',v_cost,'gross_profit',CASE WHEN v_revenue IS NOT NULL AND v_cost IS NOT NULL THEN v_revenue-v_cost END,'gross_margin',CASE WHEN v_revenue IS NOT NULL AND v_cost IS NOT NULL AND v_revenue<>0 THEN ((v_revenue-v_cost)/v_revenue)*100 END,'invoice_count',v_rows,'bad_invoice_rows',v_bad_invoices,'bad_sale_item_rows',v_bad_items,'currency_mismatch_rows',v_currency_mismatch,'reasons',v_reasons,'as_of',p_as_of);
END;
$$;
REVOKE ALL ON FUNCTION public.get_profitability_snapshot(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profitability_snapshot(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_profitability_snapshot(date) TO authenticated;
