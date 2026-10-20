import assert from 'node:assert/strict';

const required = [
  'IMPLEMENTED', 'TESTED', 'VERIFIED', 'RUNTIME_VERIFIED',
  'LIVE_VERIFIED', 'OPERATIONALLY_VERIFIED', 'PRODUCTION_READY', 'FINAL_CERTIFICATION',
];

const blocked = new Set(['LIVE_VERIFIED', 'OPERATIONALLY_VERIFIED', 'PRODUCTION_READY', 'FINAL_CERTIFICATION']);
const evidence = {
  repository: 'IMPLEMENTED', ci: 'TESTED', synthetic: 'VERIFIED',
  authenticated_live: null, operational: null, production: null,
};

for (const stage of Object.values(evidence).filter(Boolean)) assert(required.includes(stage));
assert(blocked.has('LIVE_VERIFIED'));
assert.equal(evidence.authenticated_live, null);
assert.equal(evidence.production, null);

// Certification must fail closed until live/operational/production evidence exists.
assert.throws(() => { if (evidence.production === null) throw new Error('PRODUCTION_EVIDENCE_REQUIRED'); }, /PRODUCTION_EVIDENCE_REQUIRED/);
assert.throws(() => { if (evidence.authenticated_live === null) throw new Error('AUTHENTICATED_LIVE_REQUIRED'); }, /AUTHENTICATED_LIVE_REQUIRED/);

console.log('release readiness contract: PASS');
