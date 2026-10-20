-- Canonical top entities remain server-side and tenant-derived after Dashboard Truth semantic hardening.
CREATE OR REPLACE FUNCTION public.get_dashboard_top_entities()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT jsonb_build_object(
    'topCustomers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.customer_id,'name',COALESCE(c.name,q.customer_id::text),'value',q.value) ORDER BY q.value DESC) FROM (SELECT customer_id,sum(subtotal) value FROM public.sales_invoices WHERE company_id=public.current_company_id() AND status IS NOT NULL AND status NOT IN ('cancelled','void') AND subtotal IS NOT NULL GROUP BY customer_id ORDER BY value DESC LIMIT 10) q LEFT JOIN public.customers c ON c.id=q.customer_id AND c.company_id=public.current_company_id()),'[]'::jsonb),
    'topProducts', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.product_id,'name',COALESCE(p.name,q.product_id::text),'value',q.value,'secondary',q.qty) ORDER BY q.value DESC) FROM (SELECT si.product_id,sum(si.line_total) value,sum(si.quantity) qty FROM public.sale_items si JOIN public.sales_invoices s ON s.id=si.invoice_id WHERE s.company_id=public.current_company_id() AND s.status IS NOT NULL AND s.status NOT IN ('cancelled','void') AND si.product_id IS NOT NULL AND si.line_total IS NOT NULL AND si.quantity IS NOT NULL GROUP BY si.product_id ORDER BY value DESC LIMIT 10) q LEFT JOIN public.products p ON p.id=q.product_id AND p.company_id=public.current_company_id()),'[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.get_dashboard_top_entities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_top_entities() TO authenticated;
