-- Close import contract drift and remove fabricated product defaults on canonical insert.
-- The application caller supplies p_is_active; the previous RPC did not expose it
-- and silently invented unit/prices/stock values when fields were missing.

DROP FUNCTION IF EXISTS public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text);

CREATE OR REPLACE FUNCTION public.import_upsert_product(
  p_company_id uuid,
  p_sku text,
  p_name text DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_cost_price numeric DEFAULT NULL,
  p_selling_price numeric DEFAULT NULL,
  p_min_stock numeric DEFAULT NULL,
  p_reorder_point numeric DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
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
    RAISE EXCEPTION 'SKU_REQUIRED';
  END IF;

  SELECT id INTO v_id
  FROM public.products
  WHERE company_id = v_company_id
    AND public.normalize_import_key(sku) = v_sku
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    IF NULLIF(trim(p_name), '') IS NULL THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
    IF NULLIF(trim(p_unit), '') IS NULL THEN RAISE EXCEPTION 'UNIT_REQUIRED'; END IF;
    IF p_cost_price IS NULL OR p_cost_price::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'COST_PRICE_REQUIRED'; END IF;
    IF p_selling_price IS NULL OR p_selling_price::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'SELLING_PRICE_REQUIRED'; END IF;
    IF p_min_stock IS NULL OR p_min_stock::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'MIN_STOCK_REQUIRED'; END IF;
    IF p_reorder_point IS NULL OR p_reorder_point::text IN ('NaN', 'Infinity', '-Infinity') THEN RAISE EXCEPTION 'REORDER_POINT_REQUIRED'; END IF;
    IF p_is_active IS NULL THEN RAISE EXCEPTION 'IS_ACTIVE_REQUIRED'; END IF;

    BEGIN
      INSERT INTO public.products(
        company_id, sku, name, unit, cost_price, selling_price,
        min_stock, reorder_point, is_active
      )
      VALUES (
        v_company_id, trim(p_sku), trim(p_name), trim(p_unit),
        p_cost_price, p_selling_price, p_min_stock, p_reorder_point, p_is_active
      )
      RETURNING id INTO v_id;
      v_action := 'inserted';
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_id
      FROM public.products
      WHERE company_id = v_company_id
        AND public.normalize_import_key(sku) = v_sku
      LIMIT 1
      FOR UPDATE;
      IF v_id IS NULL THEN RAISE; END IF;
      v_action := 'updated';
    END;
  END IF;

  IF v_action = 'updated' THEN
    UPDATE public.products
    SET name = CASE WHEN p_null_policy = 'preserve' AND p_name IS NULL THEN name ELSE coalesce(NULLIF(trim(p_name), ''), name) END,
        unit = CASE WHEN p_null_policy = 'preserve' AND p_unit IS NULL THEN unit ELSE coalesce(NULLIF(trim(p_unit), ''), unit) END,
        cost_price = CASE WHEN p_null_policy = 'preserve' AND p_cost_price IS NULL THEN cost_price ELSE p_cost_price END,
        selling_price = CASE WHEN p_null_policy = 'preserve' AND p_selling_price IS NULL THEN selling_price ELSE p_selling_price END,
        min_stock = CASE WHEN p_null_policy = 'preserve' AND p_min_stock IS NULL THEN min_stock ELSE p_min_stock END,
        reorder_point = CASE WHEN p_null_policy = 'preserve' AND p_reorder_point IS NULL THEN reorder_point ELSE p_reorder_point END,
        is_active = CASE WHEN p_null_policy = 'preserve' AND p_is_active IS NULL THEN is_active ELSE p_is_active END
    WHERE id = v_id AND company_id = v_company_id;
  END IF;

  RETURN QUERY SELECT v_id, v_action;
END;
$$;

REVOKE ALL ON FUNCTION public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,boolean,text) TO authenticated;

COMMENT ON FUNCTION public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,boolean,text) IS
  'Canonical tenant-scoped product import primitive. Inserts are fail-closed and never fabricate business values; updates honor the configured null policy.';
