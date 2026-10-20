-- Reconcile the live export-RPC implementation and execution contract.
-- Live staging already contains the fail-closed row-bound implementation, but
-- that migration lineage is not present on main. Keep the implementation in
-- source control and preserve authenticated Reports UI execution.

CREATE OR REPLACE FUNCTION public.get_inventory_export_rows(p_company_id uuid, p_max_rows integer DEFAULT 10000)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_company_id uuid := public.current_company_id(); v_limit integer; v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF p_max_rows IS NULL THEN v_limit := 10000; ELSIF p_max_rows < 1 OR p_max_rows > 10000 THEN RAISE EXCEPTION 'EXPORT_ROW_LIMIT_INVALID: p_max_rows must be between 1 and 10000'; ELSE v_limit := p_max_rows; END IF;
  IF EXISTS (SELECT 1 FROM public.inventory_balances ib WHERE ib.company_id=v_company_id OFFSET v_limit LIMIT 1) THEN RAISE EXCEPTION 'EXPORT_TOO_LARGE: inventory export exceeds safe row limit'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('product',pr.name,'warehouse',w.name,'quantity',ib.quantity,'unit_cost',ib.unit_cost,'value',CASE WHEN ib.quantity IS NULL OR ib.unit_cost IS NULL THEN NULL ELSE ib.quantity*ib.unit_cost END) ORDER BY pr.name),'[]'::jsonb) INTO v_result FROM public.inventory_balances ib LEFT JOIN public.products pr ON pr.id=ib.product_id AND pr.company_id=v_company_id LEFT JOIN public.warehouses w ON w.id=ib.warehouse_id AND w.company_id=v_company_id WHERE ib.company_id=v_company_id;
  RETURN jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result));
END; $$;

CREATE OR REPLACE FUNCTION public.get_sales_export_rows(p_company_id uuid, p_max_rows integer DEFAULT 10000)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_company_id uuid := public.current_company_id(); v_limit integer; v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF p_max_rows IS NULL THEN v_limit := 10000; ELSIF p_max_rows < 1 OR p_max_rows > 10000 THEN RAISE EXCEPTION 'EXPORT_ROW_LIMIT_INVALID: p_max_rows must be between 1 and 10000'; ELSE v_limit := p_max_rows; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_invoices s WHERE s.company_id=v_company_id AND s.status NOT IN ('cancelled','void') OFFSET v_limit LIMIT 1) THEN RAISE EXCEPTION 'EXPORT_TOO_LARGE: sales export exceeds safe row limit'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('invoice_number',s.invoice_number,'customer',c.name,'invoice_date',s.invoice_date,'total',s.total,'paid_amount',s.paid_amount,'status',s.status) ORDER BY s.invoice_date DESC),'[]'::jsonb) INTO v_result FROM public.sales_invoices s LEFT JOIN public.customers c ON c.id=s.customer_id AND c.company_id=v_company_id WHERE s.company_id=v_company_id AND s.status NOT IN ('cancelled','void');
  RETURN jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result));
END; $$;

CREATE OR REPLACE FUNCTION public.get_purchase_export_rows(p_company_id uuid, p_max_rows integer DEFAULT 10000)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_company_id uuid := public.current_company_id(); v_limit integer; v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF p_max_rows IS NULL THEN v_limit := 10000; ELSIF p_max_rows < 1 OR p_max_rows > 10000 THEN RAISE EXCEPTION 'EXPORT_ROW_LIMIT_INVALID: p_max_rows must be between 1 and 10000'; ELSE v_limit := p_max_rows; END IF;
  IF EXISTS (SELECT 1 FROM public.purchase_invoices p WHERE p.company_id=v_company_id AND p.status NOT IN ('cancelled','void') OFFSET v_limit LIMIT 1) THEN RAISE EXCEPTION 'EXPORT_TOO_LARGE: purchase export exceeds safe row limit'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('invoice_number',p.invoice_number,'supplier',s.name,'invoice_date',p.invoice_date,'total',p.total,'paid_amount',p.paid_amount,'status',p.status) ORDER BY p.invoice_date DESC),'[]'::jsonb) INTO v_result FROM public.purchase_invoices p LEFT JOIN public.suppliers s ON s.id=p.supplier_id AND s.company_id=v_company_id WHERE p.company_id=v_company_id AND p.status NOT IN ('cancelled','void');
  RETURN jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result));
END; $$;

CREATE OR REPLACE FUNCTION public.get_receivables_export_rows(p_company_id uuid, p_max_rows integer DEFAULT 10000)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_company_id uuid := public.current_company_id(); v_limit integer; v_result jsonb;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF p_max_rows IS NULL THEN v_limit := 10000; ELSIF p_max_rows < 1 OR p_max_rows > 10000 THEN RAISE EXCEPTION 'EXPORT_ROW_LIMIT_INVALID: p_max_rows must be between 1 and 10000'; ELSE v_limit := p_max_rows; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_invoices s WHERE s.company_id=v_company_id AND s.status NOT IN ('cancelled','void') AND greatest(s.total-s.paid_amount,0)>0 OFFSET v_limit LIMIT 1) THEN RAISE EXCEPTION 'EXPORT_TOO_LARGE: receivables export exceeds safe row limit'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('invoice_number',s.invoice_number,'customer',c.name,'invoice_date',s.invoice_date,'due_date',s.due_date,'total',s.total,'paid_amount',s.paid_amount,'balance',CASE WHEN s.total IS NULL OR s.paid_amount IS NULL THEN NULL ELSE greatest(s.total-s.paid_amount,0) END) ORDER BY s.invoice_date DESC),'[]'::jsonb) INTO v_result FROM public.sales_invoices s LEFT JOIN public.customers c ON c.id=s.customer_id AND c.company_id=v_company_id WHERE s.company_id=v_company_id AND s.status NOT IN ('cancelled','void') AND greatest(s.total-s.paid_amount,0)>0;
  RETURN jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result),'as_of',current_date);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_inventory_export_rows(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_export_rows(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_purchase_export_rows(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_receivables_export_rows(uuid,integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_inventory_export_rows(uuid,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_sales_export_rows(uuid,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_purchase_export_rows(uuid,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_receivables_export_rows(uuid,integer) FROM anon;
