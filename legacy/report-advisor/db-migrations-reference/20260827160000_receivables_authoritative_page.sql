-- Canonical receivables truth: totals and page rows are computed from the full tenant dataset.
CREATE OR REPLACE FUNCTION public.get_receivables_report_page(
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_page integer := greatest(coalesce(p_page, 0), 0);
  v_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  v_total_rows integer := 0;
  v_total_outstanding numeric := 0;
  v_rows jsonb := '[]'::jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_REQUIRED'; END IF;
  SELECT count(*)::integer,
         coalesce(sum(greatest(coalesce(si.total, 0) - coalesce(si.paid_amount, 0), 0)), 0)
    INTO v_total_rows, v_total_outstanding
    FROM public.sales_invoices si
   WHERE si.company_id = v_company_id
     AND coalesce(si.total, 0) > coalesce(si.paid_amount, 0)
     AND coalesce(si.status, 'confirmed') <> 'cancelled';

  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.invoice_date DESC, q.id ASC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT si.id, si.invoice_number, si.invoice_date, si.due_date, si.total,
             si.paid_amount,
             greatest(coalesce(si.total, 0) - coalesce(si.paid_amount, 0), 0) AS balance,
             si.status,
             jsonb_build_object('id', c.id, 'name', c.name) AS customer
        FROM public.sales_invoices si
        LEFT JOIN public.customers c ON c.id = si.customer_id AND c.company_id = v_company_id
       WHERE si.company_id = v_company_id
         AND coalesce(si.total, 0) > coalesce(si.paid_amount, 0)
         AND coalesce(si.status, 'confirmed') <> 'cancelled'
       ORDER BY si.invoice_date DESC, si.id ASC
       OFFSET v_page * v_page_size LIMIT v_page_size
    ) q;

  RETURN jsonb_build_object('status', CASE WHEN v_total_rows = 0 THEN 'NO_DATA' ELSE 'CALCULATED' END,
    'page', v_page, 'page_size', v_page_size, 'total_rows', v_total_rows,
    'total_outstanding', v_total_outstanding, 'rows', v_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.get_receivables_report_page(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_receivables_report_page(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_receivables_report_page(integer, integer) TO authenticated;
