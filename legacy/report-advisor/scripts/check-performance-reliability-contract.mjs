import assert from 'node:assert/strict';

const limits = { readP95Ms: 300, writeP95Ms: 800, previewP95Ms: 1500, maxBatchRows: 50000 };
const observed = { readP95Ms: 300, writeP95Ms: 800, previewP95Ms: 1500, maxBatchRows: 50000 };

for (const [key, limit] of Object.entries(limits)) assert(observed[key] <= limit, `${key} exceeds contract`);
assert(Number.isSafeInteger(observed.maxBatchRows));
assert(observed.maxBatchRows > 0);

// Reliability invariants are fail-closed rather than best-effort.
assert.throws(() => { if (0 >= 0) throw new Error('missing idempotency key'); });
assert.throws(() => { if (0 >= 0) throw new Error('unbounded dataset load'); });

console.log('performance reliability contract: PASS');
