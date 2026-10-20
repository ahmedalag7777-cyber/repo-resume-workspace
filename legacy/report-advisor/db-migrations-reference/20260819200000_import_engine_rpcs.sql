-- Production import primitives: normalized matching, idempotent upsert, and row-level lineage.
-- The application should call these RPCs instead of direct bulk inserts for imports.

CREATE OR REPLACE FUNCTION normalize_import_key(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(lower(trim(coalesce(input, ''))), '\s+', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION import_upsert_product(
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
AS $$
DECLARE
  v_id uuid;
  v_sku text := normalize_import_key(p_sku);
BEGIN
  IF v_sku IS NULL THEN
    RAISE EXCEPTION 'SKU is required';
  END IF;

  SELECT id INTO v_id
  FROM products
  WHERE company_id = p_company_id
    AND normalize_import_key(sku) = v_sku
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO products(company_id, sku, name, unit, cost_price, selling_price, min_stock, reorder_point)
    VALUES (
      p_company_id, trim(p_sku), coalesce(p_name, ''), coalesce(p_unit, 'قطعة'),
      coalesce(p_cost_price, 0), coalesce(p_selling_price, 0),
      coalesce(p_min_stock, 0), coalesce(p_reorder_point, 0)
    )
    RETURNING id INTO v_id;
    RETURN QUERY SELECT v_id, 'inserted'::text;
    RETURN;
  END IF;

  UPDATE products
  SET name = CASE WHEN p_null_policy = 'preserve' AND p_name IS NULL THEN name ELSE coalesce(p_name, name) END,
      unit = CASE WHEN p_null_policy = 'preserve' AND p_unit IS NULL THEN unit ELSE coalesce(p_unit, unit) END,
      cost_price = CASE WHEN p_null_policy = 'preserve' AND p_cost_price IS NULL THEN cost_price ELSE coalesce(p_cost_price, cost_price) END,
      selling_price = CASE WHEN p_null_policy = 'preserve' AND p_selling_price IS NULL THEN selling_price ELSE coalesce(p_selling_price, selling_price) END,
      min_stock = CASE WHEN p_null_policy = 'preserve' AND p_min_stock IS NULL THEN min_stock ELSE coalesce(p_min_stock, min_stock) END,
      reorder_point = CASE WHEN p_null_policy = 'preserve' AND p_reorder_point IS NULL THEN reorder_point ELSE coalesce(p_reorder_point, reorder_point) END
  WHERE id = v_id;

  RETURN QUERY SELECT v_id, 'updated'::text;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_products_company_normalized_sku
ON products(company_id, normalize_import_key(sku));
