-- Enforce the canonical import identity at the database boundary.
-- Application-side matching is not sufficient: concurrent imports must converge
-- on one product per (company, normalized SKU).

DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT company_id, public.normalize_import_key(sku) AS normalized_sku
    FROM public.products
    WHERE public.normalize_import_key(sku) IS NOT NULL
    GROUP BY company_id, public.normalize_import_key(sku)
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'IMPORT_BUSINESS_KEY_DUPLICATES:%', duplicate_count
      USING HINT = 'Resolve duplicate products by company and normalized SKU before enabling the canonical unique index.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_normalized_sku
  ON public.products(company_id, public.normalize_import_key(sku))
  WHERE public.normalize_import_key(sku) IS NOT NULL;

COMMENT ON INDEX public.uq_products_company_normalized_sku IS
  'Canonical product identity for imports: one normalized SKU per tenant.';
