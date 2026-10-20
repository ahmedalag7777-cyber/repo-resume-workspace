import assert from 'node:assert/strict';

const workItem = { id: 'wi-a', tenant_id: 'tenant-a', assignee_id: 'user-a', status: 'COMPLETED' };
const outcome = { work_item_id: workItem.id, tenant_id: workItem.tenant_id, actor_id: 'user-a', provenance: { generated: true, work_item_id: workItem.id } };

function recordOutcome(wi, input) {
  assert(wi, 'WORK_ITEM_REQUIRED');
  assert.equal(wi.status, 'COMPLETED', 'WORK_ITEM_NOT_COMPLETED');
  assert.equal(input.tenant_id, wi.tenant_id, 'TENANT_BOUNDARY');
  assert.equal(input.actor_id, wi.assignee_id, 'ASSIGNEE_BOUNDARY');
  return { ...input, provenance: { generated: true, work_item_id: wi.id } };
}

const recorded = recordOutcome(workItem, outcome);
assert.deepEqual(recorded.provenance, { generated: true, work_item_id: 'wi-a' });
assert.throws(() => recordOutcome(null, outcome), /WORK_ITEM_REQUIRED/);
assert.throws(() => recordOutcome({ ...workItem, status: 'EXECUTING' }, outcome), /WORK_ITEM_NOT_COMPLETED/);
assert.throws(() => recordOutcome(workItem, { ...outcome, tenant_id: 'tenant-b' }), /TENANT_BOUNDARY/);
assert.throws(() => recordOutcome(workItem, { ...outcome, actor_id: 'user-b' }), /ASSIGNEE_BOUNDARY/);

const forged = recordOutcome(workItem, { ...outcome, provenance: { generated: false, work_item_id: 'forged' } });
assert.deepEqual(forged.provenance, { generated: true, work_item_id: 'wi-a' });

console.log('work item outcome provenance: PASS');
