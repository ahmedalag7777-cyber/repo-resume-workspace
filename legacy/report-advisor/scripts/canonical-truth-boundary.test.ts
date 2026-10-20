import assert from 'node:assert/strict';
import { assertCanonicalBoundary, reconcileForCanonical } from '../src/lib/import/canonical-truth-boundary.ts';

const base = {
  rowNumber: 1,
  data: {
    sku: 'SKU-1', name: 'Widget', unit: 'pcs', cost_price: 10,
    selling_price: 12, min_stock: 1, reorder_point: 2, is_active: true,
  },
};

const reconciled = reconcileForCanonical(
  'products',
  'tenant-a',
  'inventory.xlsx',
  'sha256:file-a',
  'sha256:file-a',
  (row, rowNumber) => `evidence:sha256:file-a:${rowNumber}:${JSON.stringify(row)}`,
  [base],
);
assert.equal(reconciled.rejected.length, 0);
assert.equal(reconciled.rows.length, 1);
assert.equal(reconciled.rows[0]?.reconciliation, 'RECONCILED');
assert.equal(reconciled.rows[0]?.provenance.tenantId, 'tenant-a');
assert.equal(reconciled.rows[0]?.provenance.sourceHash, 'sha256:file-a');
assert.equal(reconciled.rows[0]?.provenance.evidenceId.startsWith('evidence:'), true);
assert.equal(reconciled.rows[0]?.data.cost_price, 10);

// Adversarial: two conflicting facts for the same canonical identity must not become truth.
const conflict = reconcileForCanonical(
  'products',
  'tenant-a',
  'inventory.xlsx',
  'sha256:file-a',
  'sha256:file-a',
  (row, rowNumber) => `evidence:sha256:file-a:${rowNumber}:${JSON.stringify(row)}`,
  [
    base,
    { rowNumber: 2, data: { ...base.data, cost_price: 99 } },
  ],
);
assert.equal(conflict.rows.length, 1);
assert.deepEqual(conflict.rejected, [{ rowNumber: 2, reason: 'CONFLICTING_EVIDENCE_FOR_SAME_CANONICAL_IDENTITY' }]);

// Adversarial: incomplete provenance is fail-closed.
assert.throws(
  () => reconcileForCanonical('products', 'tenant-a', '', 'sha256:file-a', 'sha256:file-a', () => 'evidence:x', [base]),
  /SOURCE_REQUIRED/,
);

// Adversarial: a reconciled row cannot cross a different tenant boundary.
assert.throws(() => assertCanonicalBoundary(reconciled.rows[0]!, 'tenant-b'), /CANONICAL_TENANT_MISMATCH/);

// Adversarial: NULL remains semantically NULL and is never rewritten to zero by reconciliation.
const nullable = reconcileForCanonical(
  'customers',
  'tenant-a',
  'customers.xlsx',
  'sha256:file-b',
  'sha256:file-b',
  () => 'evidence:nullable',
  [{ rowNumber: 3, data: { name: 'Customer', segment: 'retail', credit_limit: null, payment_terms_days: 30 } }],
);
assert.equal(nullable.rows.length, 1);
assert.equal(nullable.rows[0]?.data.credit_limit, null);
assert.notEqual(nullable.rows[0]?.data.credit_limit, 0);

console.log('canonical truth boundary adversarial regression: PASS');
