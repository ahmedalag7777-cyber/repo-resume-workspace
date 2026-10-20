import assert from 'node:assert/strict';

const clampNonNegativeFinite = (value) => Number.isFinite(value) ? Math.max(0, value) : 0;
const sanitizeHistory = (values) => values.filter(Number.isFinite).map((value) => Math.max(0, value));
const receivable = (total, paid) => Math.max(0, total - clampNonNegativeFinite(paid));

assert.equal(receivable(100, -50), 100);
assert.equal(receivable(100, Number.NaN), 100);
assert.equal(receivable(100, 120), 0);
assert.deepEqual(sanitizeHistory([10, -100, 20, Number.NaN]), [10, 0, 20]);
assert.deepEqual(sanitizeHistory([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]), []);
assert.equal(clampNonNegativeFinite(-10), 0);
assert.equal(clampNonNegativeFinite(Number.NaN), 0);
assert.equal(clampNonNegativeFinite(15), 15);
console.log('canonical intelligence input guards: PASS');
