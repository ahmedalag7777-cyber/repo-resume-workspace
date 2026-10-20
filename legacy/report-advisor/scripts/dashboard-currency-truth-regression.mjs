import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20260904063122_reconcile_dashboard_currency_truth.sql','utf8');

function assertCurrencyGate(source){
  assert.match(source,/sales_currency_mismatch_rows/);
  assert.match(source,/purchase_currency_mismatch_rows/);
  assert.match(source,/currency IS NOT NULL AND c\.currency IS NOT NULL AND currency<>c\.currency/);
  assert.match(source,/sales_currency_mismatch_rows=0 AND k\.purchase_currency_mismatch_rows=0/);
  assert.match(source,/CASE WHEN k\.sales_currency_mismatch_rows=0 THEN \(SELECT rows FROM trend\) ELSE '\[\]'::jsonb END/);
  assert.match(source,/CASE WHEN k\.sales_currency_mismatch_rows=0 THEN \(SELECT rows FROM top_customers\) ELSE '\[\]'::jsonb END/);
  assert.match(source,/CASE WHEN k\.sales_currency_mismatch_rows=0 THEN \(SELECT rows FROM top_products\) ELSE '\[\]'::jsonb END/);
  assert.match(source,/CASE WHEN k\.sales_currency_mismatch_rows=0 THEN \(SELECT rows FROM categories\) ELSE '\[\]'::jsonb END/);
  assert.match(source,/CASE WHEN k\.sales_currency_mismatch_rows=0 THEN \(SELECT rows FROM aging\) ELSE '\[\]'::jsonb END/);
  assert.match(source,/total_sales.*sales_currency_mismatch_rows=0/s);
  assert.match(source,/payables.*purchase_currency_mismatch_rows=0/s);
}

assertCurrencyGate(sql);
const tampered=sql.replaceAll('sales_currency_mismatch_rows=0','sales_currency_mismatch_rows>=0');
assert.throws(()=>assertCurrencyGate(tampered));
console.log('PASS dashboard currency-consistency source contract');
console.log('PASS test-of-test rejects weakened currency gate');
