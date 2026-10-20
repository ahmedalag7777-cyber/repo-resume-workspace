-- Close the last canonical export caller-tenant mismatch gap.
CREATE OR REPLACE FUNCTION public.get_receivables_export_rows(p_company_id uuid, p_max_rows integer DEFAULT 10000)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_limit integer := greatest(1, least(coalesce(p_max_rows, 10000), 10000));
  v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.sales_invoices s
    WHERE s.company_id=v_company_id AND s.status NOT IN ('cancelled','void')
      AND greatest(s.total-s.paid_amount,0)>0
    OFFSET v_limit LIMIT 1
  ) THEN RAISE EXCEPTION 'EXPORT_TOO_LARGE: receivables export exceeds safe row limit'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'invoice_number',s.invoice_number,'customer',c.name,'invoice_date',s.invoice_date,
    'due_date',s.due_date,'total',s.total,'paid_amount',s.paid_amount,
    'balance',case when s.total is null or s.paid_amount is null then null else greatest(s.total-s.paid_amount,0) end
  ) ORDER BY s.invoice_date DESC), '[]'::jsonb) INTO v_result
  FROM public.sales_invoices s
  LEFT JOIN public.customers c ON c.id=s.customer_id AND c.company_id=v_company_id
  WHERE s.company_id=v_company_id AND s.status NOT IN ('cancelled','void') AND greatest(s.total-s.paid_amount,0)>0;
  RETURN jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result),'as_of',current_date);
END;
$function$;

ALTER FUNCTION public.get_receivables_export_rows(uuid, integer) SET search_path = public;
REVOKE ALL ON FUNCTION public.get_receivables_export_rows(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_receivables_export_rows(uuid, integer) TO authenticated;
