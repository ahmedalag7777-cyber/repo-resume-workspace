import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260831071000_canonical_profitability_null_truth.sql', 'utf8');
const page = fs.readFileSync('src/pages/ProfitabilityReportCanonicalPage.tsx', 'utf8');

// Adversarial: an invoice with no sale_items is missing cost evidence, not zero cost.
assert.match(sql, /NOT EXISTS \(SELECT 1 FROM public\.sale_items si WHERE si\.invoice_id = s\.id\)/);
assert.match(sql, /jsonb_build_array\('MISSING_COST_EVIDENCE'\)/);

// Adversarial: cost aggregation must not coerce missing evidence to zero.
assert.match(sql, /sum\(si\.quantity \* si\.cost_price\)/);
assert.doesNotMatch(sql, /coalesce\([^;\n]*sum\(si\.quantity \* si\.cost_price\)/i);

// Adversarial: unavailable financial truth must surface as unavailable, not a rendered number.
assert.match(sql, /v_status := 'INSUFFICIENT_DATA'/);
assert.match(page, /snapshot\.status === 'CALCULATED'/);
assert.match(page, /'غير متاح'/);

console.log('canonical profitability NULL-truth adversarial regression: PASS');
