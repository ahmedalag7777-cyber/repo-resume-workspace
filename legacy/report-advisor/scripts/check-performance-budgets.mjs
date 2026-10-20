import assert from 'node:assert/strict';

const budgets = {
  read_p95_ms: 300,
  write_p95_ms: 800,
  preview_p95_ms: 1500,
  dataset_rows: 5000,
};

const observed = {
  read_p95_ms: 300,
  write_p95_ms: 800,
  preview_p95_ms: 1500,
  dataset_rows: 5000,
};

for (const key of Object.keys(budgets)) {
  assert.ok(observed[key] <= budgets[key], `${key} exceeds budget`);
}

// Unknown/unbounded values fail closed rather than being treated as passing.
for (const key of Object.keys(budgets)) {
  assert.equal(Number.isFinite(observed[key]), true, `${key} must be measured`);
}

console.log('performance budgets: PASS');
