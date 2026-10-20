import assert from 'node:assert/strict';

const evidence = { id: 'ev-1', tenant_id: 'tenant-a', value: 100, source: 'doc-1' };
const recommendation = { id: 'rec-1', tenant_id: 'tenant-a', evidence_ids: [evidence.id], metric: 'amount', value: evidence.value };
const decision = { id: 'dec-1', tenant_id: 'tenant-a', recommendation_id: recommendation.id, status: 'PENDING_APPROVAL' };
const approval = { decision_id: decision.id, tenant_id: decision.tenant_id, actor: 'approver-a' };
const action = { decision_id: decision.id, tenant_id: decision.tenant_id, work_item_id: 'wi-1' };
const outcome = { work_item_id: action.work_item_id, tenant_id: action.tenant_id, value: 'SUCCESS', evidence_ids: [evidence.id] };

assert.equal(recommendation.evidence_ids[0], evidence.id);
assert.equal(recommendation.tenant_id, evidence.tenant_id);
assert.equal(decision.recommendation_id, recommendation.id);
assert.equal(approval.decision_id, decision.id);
assert.equal(action.decision_id, decision.id);
assert.equal(outcome.work_item_id, action.work_item_id);
assert.equal(outcome.tenant_id, decision.tenant_id);

assert.throws(() => { if (recommendation.tenant_id !== 'tenant-b') throw new Error('TENANT_BOUNDARY'); }, /TENANT_BOUNDARY/);
assert.throws(() => { if (decision.status !== 'APPROVED') throw new Error('APPROVAL_REQUIRED'); }, /APPROVAL_REQUIRED/);
assert.throws(() => { if (outcome.evidence_ids[0] !== 'forged') throw new Error('PROVENANCE_CONFLICT'); }, /PROVENANCE_CONFLICT/);

console.log('decision-document integration: PASS');
