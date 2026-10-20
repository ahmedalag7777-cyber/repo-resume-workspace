import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260908213000_reconcile_import_runtime_contract_current_main.sql', 'utf8');

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.import_commit_batch\(/);
assert.match(migration, /p_entity_type IS NULL OR p_entity_type NOT IN \('products', 'customers', 'sales_invoices'\)/);
assert.match(migration, /p_company_id IS DISTINCT FROM v_company_id/);
assert.match(migration, /jsonb_typeof\(p_rows\) IS DISTINCT FROM 'array'/);
assert.match(migration, /v_row->>'customer_name'/);
assert.match(migration, /public\.import_upsert_sales_invoice\(/);
assert.match(migration, /uuid, text, date, uuid, text, numeric, numeric, numeric, numeric, text, text/);
assert.match(migration, /SET search_path TO 'public'/);
assert.match(migration, /SET search_path = public, pg_catalog/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.import_commit_batch\(uuid, text, jsonb, text\) FROM PUBLIC, anon/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.import_commit_batch\(uuid, text, jsonb, text\) TO authenticated/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.import_upsert_sales_invoice\([\s\S]*?\) FROM PUBLIC, anon/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.import_upsert_sales_invoice\([\s\S]*?\) TO authenticated/);

console.log('Import runtime current-main contract: PASS');
