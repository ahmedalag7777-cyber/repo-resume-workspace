-- Concurrency hardening for product imports.
-- The unique business-key index is the serialization boundary; this RPC handles
-- a concurrent insert race without leaking a raw unique-violation to callers.

CREATE OR REPLACE FUNCTION public.import_upsert_product(
  p_company_id uuid,
  p_sku text,
  p_name text,
  p_unit text DEFAULT NULL,
  p_cost_price numeric DEFAULT NULL,
  p_selling_price numeric DEFAULT NULL,
  p_min_stock numeric DEFAULT NULL,
  p_reorder_point numeric DEFAULT NULL,
  p_null_policy text DEFAULT 'preserve'
)
RETURNS TABLE(target_id uuid, action text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_id uuid;
  v_sku text := public.normalize_import_key(p_sku);
  v_action text := 'updated';
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;
  IF v_sku IS NULL THEN
    RAISE EXCEPTION 'SKU is required';
  END IF;

  SELECT id INTO v_id
  FROM public.products
  WHERE company_id = v_company_id
    AND public.normalize_import_key(sku) = v_sku
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    BEGIN
      INSERT INTO public.products(company_id, sku, name, unit, cost_price, selling_price, min_stock, reorder_point)
      VALUES (
        v_company_id, trim(p_sku), coalesce(p_name, ''), coalesce(p_unit, 'قطعة'),
        coalesce(p_cost_price, 0), coalesce(p_selling_price, 0),
        coalesce(p_min_stock, 0), coalesce(p_reorder_point, 0)
      )
      RETURNING id INTO v_id;
      v_action := 'inserted';
    EXCEPTION WHEN unique_violation THEN
      -- Another transaction won the canonical business-key race.
      SELECT id INTO v_id
      FROM public.products
      WHERE company_id = v_company_id
        AND public.normalize_import_key(sku) = v_sku
      LIMIT 1
      FOR UPDATE;
      IF v_id IS NULL THEN
        RAISE;
      END IF;
      v_action := 'updated';
    END;
  END IF;

  IF v_action = 'updated' THEN
    UPDATE public.products
    SET name = CASE WHEN p_null_policy = 'preserve' AND p_name IS NULL THEN name ELSE coalesce(p_name, name) END,
        unit = CASE WHEN p_null_policy = 'preserve' AND p_unit IS NULL THEN unit ELSE coalesce(p_unit, unit) END,
        cost_price = CASE WHEN p_null_policy = 'preserve' AND p_cost_price IS NULL THEN cost_price ELSE coalesce(p_cost_price, cost_price) END,
        selling_price = CASE WHEN p_null_policy = 'preserve' AND p_selling_price IS NULL THEN selling_price ELSE coalesce(p_selling_price, selling_price) END,
        min_stock = CASE WHEN p_null_policy = 'preserve' AND p_min_stock IS NULL THEN min_stock ELSE coalesce(p_min_stock, min_stock) END,
        reorder_point = CASE WHEN p_null_policy = 'preserve' AND p_reorder_point IS NULL THEN reorder_point ELSE coalesce(p_reorder_point, reorder_point) END
    WHERE id = v_id AND company_id = v_company_id;
  END IF;

  RETURN QUERY SELECT v_id, v_action;
END;
$$;

REVOKE ALL ON FUNCTION public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text) TO authenticated;

COMMENT ON FUNCTION public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text) IS
  'Tenant-scoped, business-key-safe import upsert with concurrent insert race handling.';
