-- Inventory report truth: business counts/valuation and display rows are server-authoritative.
-- Tenant is derived from current_company_id(); page size and display filter cannot define totals.
CREATE INDEX IF NOT EXISTS idx_inventory_balances_company_updated
  ON public.inventory_balances(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_company_product
  ON public.inventory_balances(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_products_company_active
  ON public.products(company_id, is_active);

-- Replace both historical signatures so a prior 2-arg function cannot shadow the new 3-arg contract.
DROP FUNCTION IF EXISTS public.get_inventory_report_snapshot(integer,integer,text);
DROP FUNCTION IF EXISTS public.get_inventory_report_snapshot(integer,integer);

CREATE OR REPLACE FUNCTION public.get_inventory_report_snapshot(
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 25,
  p_filter text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_page integer := GREATEST(COALESCE(p_page,0),0);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size,25),1),100);
  v_filter text := CASE WHEN p_filter IN ('all','low','out') THEN p_filter ELSE 'all' END;
  v_rows jsonb;
  v_result jsonb;
  v_unknown_rows bigint;
  v_total_value numeric;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;

  WITH base AS (
    SELECT ib.id, ib.quantity, ib.unit_cost, ib.updated_at,
           p.id AS product_id, p.name AS product_name, p.sku AS product_sku,
           p.reorder_point, w.id AS warehouse_id, w.name AS warehouse_name
    FROM public.inventory_balances ib
    LEFT JOIN public.products p ON p.id=ib.product_id AND p.company_id=v_company_id
    LEFT JOIN public.warehouses w ON w.id=ib.warehouse_id AND w.company_id=v_company_id
    WHERE ib.company_id=v_company_id
      AND (
        v_filter='all'
        OR (v_filter='low' AND ib.quantity IS NOT NULL AND ib.quantity > 0 AND p.reorder_point IS NOT NULL AND ib.quantity <= p.reorder_point)
        OR (v_filter='out' AND ib.quantity IS NOT NULL AND ib.quantity <= 0)
      )
  ), paged AS (
    SELECT * FROM base ORDER BY updated_at DESC, id DESC OFFSET v_page*v_page_size LIMIT v_page_size
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'quantity', quantity,
    'unit_cost', unit_cost,
    'value', CASE WHEN quantity IS NULL OR unit_cost IS NULL THEN NULL ELSE quantity*unit_cost END,
    'product', jsonb_build_object('id', product_id, 'name', product_name, 'sku', product_sku, 'reorder_point', reorder_point),
    'warehouse', jsonb_build_object('id', warehouse_id, 'name', warehouse_name)
  ) ORDER BY updated_at DESC, id DESC), '[]'::jsonb)
  INTO v_rows
  FROM paged;

  SELECT count(*) FILTER (WHERE ib.quantity IS NULL OR ib.unit_cost IS NULL),
         CASE WHEN count(*) FILTER (WHERE ib.quantity IS NULL OR ib.unit_cost IS NULL) > 0 THEN NULL
              ELSE COALESCE(sum(ib.quantity*ib.unit_cost),0) END
  INTO v_unknown_rows, v_total_value
  FROM public.inventory_balances ib
  WHERE ib.company_id=v_company_id;

  SELECT jsonb_build_object(
    'rows', v_rows,
    'page', v_page,
    'pageSize', v_page_size,
    'filter', v_filter,
    'totalRows', (SELECT count(*) FROM public.inventory_balances ib WHERE ib.company_id=v_company_id),
    'filteredRows', (SELECT count(*) FROM public.inventory_balances ib LEFT JOIN public.products p ON p.id=ib.product_id AND p.company_id=v_company_id WHERE ib.company_id=v_company_id AND (
      v_filter='all'
      OR (v_filter='low' AND ib.quantity IS NOT NULL AND ib.quantity > 0 AND p.reorder_point IS NOT NULL AND ib.quantity <= p.reorder_point)
      OR (v_filter='out' AND ib.quantity IS NOT NULL AND ib.quantity <= 0)
    )),
    'lowStock', (SELECT count(*) FROM public.inventory_balances ib LEFT JOIN public.products p ON p.id=ib.product_id AND p.company_id=v_company_id WHERE ib.company_id=v_company_id AND ib.quantity IS NOT NULL AND ib.quantity > 0 AND p.reorder_point IS NOT NULL AND ib.quantity <= p.reorder_point),
    'outOfStock', (SELECT count(*) FROM public.inventory_balances ib WHERE ib.company_id=v_company_id AND ib.quantity IS NOT NULL AND ib.quantity <= 0),
    'unknownRows', v_unknown_rows,
    'totalValue', v_total_value,
    'dataStatus', CASE WHEN (SELECT count(*) FROM public.inventory_balances WHERE company_id=v_company_id)=0 THEN 'NO_DATA' WHEN v_unknown_rows>0 THEN 'INSUFFICIENT_DATA' ELSE 'CALCULATED' END
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_inventory_report_snapshot(integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inventory_report_snapshot(integer,integer,text) TO authenticated;
