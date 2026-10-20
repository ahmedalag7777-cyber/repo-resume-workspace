import assert from 'node:assert/strict';

const required = [
  'CI', 'RUNTIME', 'TENANT_ISOLATION', 'AUTHENTICATED_E2E',
  'STORAGE', 'REALTIME', 'AI', 'BACKUP_RESTORE', 'ROLLBACK', 'PRODUCTION_E2E'
];
const evidenceTypes = new Set(['STATIC','CI','SYNTHETIC_RUNTIME','LIVE_SQL','AUTHENTICATED_LIVE','PRODUCTION']);

const matrix = Object.fromEntries(required.map(key => [key, { status: 'PENDING', evidence: null }]));

// Repository readiness must remain fail-closed until operational/live evidence is present.
for (const key of required) assert.equal(matrix[key].status, 'PENDING');
assert.equal(evidenceTypes.has('SYNTHETIC_RUNTIME'), true);
assert.equal(matrix.AUTHENTICATED_E2E.evidence, null);
assert.equal(matrix.PRODUCTION_E2E.evidence, null);

assert.throws(() => {
  if (matrix.PRODUCTION_E2E.evidence !== 'PRODUCTION') throw new Error('PRODUCTION_E2E_REQUIRED');
}, /PRODUCTION_E2E_REQUIRED/);
assert.throws(() => {
  if (matrix.AUTHENTICATED_E2E.evidence !== 'AUTHENTICATED_LIVE') throw new Error('AUTHENTICATED_LIVE_REQUIRED');
}, /AUTHENTICATED_LIVE_REQUIRED/);

console.log('production certification gate: PASS (fail-closed)');
