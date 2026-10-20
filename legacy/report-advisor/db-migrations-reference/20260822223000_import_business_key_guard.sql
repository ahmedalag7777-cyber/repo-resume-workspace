-- Hard invariant for product import concurrency and canonical key matching.
-- Keep the DB constraint as the final authority even when two import workers race.
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_normalized_sku
  ON products (company_id, normalize_import_key(sku));

COMMENT ON INDEX uq_products_company_normalized_sku IS
  'One normalized SKU per tenant; final concurrency/idempotency guard for product imports.';
