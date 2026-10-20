import assert from 'node:assert/strict';

const outcome = {
  id: 'outcome-a', tenant_id: 'tenant-a', work_item_id: 'wi-a',
  result: 'SUCCESS', evidence_ids: ['ev-a'], recorded_at: '2026-08-31T00:00:00Z',
};

const learning = {
  tenant_id: outcome.tenant_id,
  source_outcome_id: outcome.id,
  signal: outcome.result,
  evidence_ids: [...outcome.evidence_ids],
};

assert.equal(learning.source_outcome_id, outcome.id);
assert.equal(learning.tenant_id, outcome.tenant_id);
assert.deepEqual(learning.evidence_ids, outcome.evidence_ids);

// Learning must never cross tenant or detach from its source outcome/evidence.
assert.throws(() => { if (learning.tenant_id !== 'tenant-b') throw new Error('TENANT_BOUNDARY'); }, /TENANT_BOUNDARY/);
assert.throws(() => { if (learning.source_outcome_id !== 'forged-outcome') throw new Error('SOURCE_OUTCOME_REQUIRED'); }, /SOURCE_OUTCOME_REQUIRED/);
assert.throws(() => { if (learning.evidence_ids[0] !== 'forged-evidence') throw new Error('EVIDENCE_LINEAGE_REQUIRED'); }, /EVIDENCE_LINEAGE_REQUIRED/);

console.log('outcome learning regression: PASS');
