-- Concurrency-safe business-key invariant for canonical product imports.
-- normalize_import_key is deterministic and immutable for a given input; the unique
-- index makes concurrent imports converge on one product rather than racing inserts.
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_normalized_sku
  ON products (company_id, normalize_import_key(sku));

COMMENT ON INDEX uq_products_company_normalized_sku IS
  'Canonical import business key: one normalized SKU per tenant.';
