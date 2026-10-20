import assert from 'node:assert/strict';

const REQUIRED = ['tenant', 'auth', 'decision', 'outcome', 'storage', 'realtime', 'artifact'];
const TYPES = new Set(['STATIC','CI','SYNTHETIC RUNTIME','LIVE SQL','AUTHENTICATED LIVE','PRODUCTION']);

function validateEvidence(evidence) {
  for (const key of REQUIRED) assert.ok(evidence[key], `EVIDENCE_${key.toUpperCase()}_REQUIRED`);
  assert.ok(TYPES.has(evidence.type), 'EVIDENCE_TYPE_INVALID');
  assert.ok(evidence.exact_sha, 'EVIDENCE_EXACT_SHA_REQUIRED');
  return true;
}

const synthetic = Object.fromEntries(REQUIRED.map(k => [k, { status: 'PASS' }]));
synthetic.type = 'SYNTHETIC RUNTIME';
synthetic.exact_sha = 'synthetic-under-test';
assert.equal(validateEvidence(synthetic), true);

assert.throws(() => validateEvidence({ ...synthetic, auth: null }), /EVIDENCE_AUTH_REQUIRED/);
assert.throws(() => validateEvidence({ ...synthetic, type: 'CLAIMED_PRODUCTION' }), /EVIDENCE_TYPE_INVALID/);
assert.throws(() => validateEvidence({ ...synthetic, exact_sha: '' }), /EVIDENCE_EXACT_SHA_REQUIRED/);

console.log('production e2e evidence gate: PASS');
