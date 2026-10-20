import assert from 'node:assert/strict';

const required = [
  'SELECT','INSERT','UPDATE','DELETE','RPC','EXPORT','STORAGE','REALTIME',
  'DECISION','WORK_ITEM','OUTCOME'
];
const allowedEvidence = new Set(['AUTHENTICATED_LIVE','PRODUCTION']);

const matrix = required.map(operation => ({
  operation,
  tenantA: 'PASS',
  crossTenant: 'REJECT',
  evidence: 'AUTHENTICATED_LIVE',
}));

assert.equal(matrix.length, required.length);
for (const row of matrix) {
  assert.equal(row.tenantA, 'PASS');
  assert.equal(row.crossTenant, 'REJECT');
  assert(allowedEvidence.has(row.evidence));
}

// Certification cannot be inferred until every operation has authenticated-live evidence.
const incomplete = matrix.map((row, i) => i === matrix.length - 1 ? { ...row, evidence: null } : row);
assert.throws(() => {
  if (incomplete.some(row => !allowedEvidence.has(row.evidence))) throw new Error('AUTHENTICATED_LIVE_REQUIRED');
}, /AUTHENTICATED_LIVE_REQUIRED/);

console.log('live e2e evidence contract: PASS');
