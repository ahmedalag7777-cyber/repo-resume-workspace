import assert from 'node:assert/strict';

const A = { tenant_id: 'tenant-a', user_id: 'user-a', role: 'manager' };
const B = { tenant_id: 'tenant-b', user_id: 'user-b', role: 'manager' };

function createDecision(actor) { return { id: 'decision-a', tenant_id: actor.tenant_id, status: 'DRAFT', created_by: actor.user_id }; }
function approve(d, actor) {
  assert.equal(d.tenant_id, actor.tenant_id, 'TENANT_BOUNDARY');
  assert.notEqual(d.created_by, actor.user_id, 'SELF_APPROVAL_FORBIDDEN');
  assert.equal(d.status, 'DRAFT', 'TERMINAL_STATE');
  return { ...d, status: 'APPROVED', approved_by: actor.user_id };
}
function execute(d, actor, work) {
  assert.equal(d.tenant_id, actor.tenant_id, 'TENANT_BOUNDARY');
  assert.equal(d.status, 'APPROVED', 'APPROVAL_REQUIRED');
  assert.equal(work.tenant_id, d.tenant_id, 'WORK_TENANT_BOUNDARY');
  assert.equal(work.assignee_id, actor.user_id, 'ASSIGNEE_REQUIRED');
  assert.equal(work.status, 'COMPLETED', 'WORK_COMPLETION_REQUIRED');
  return { ...d, status: 'EXECUTED' };
}
function recordOutcome(work, actor) {
  assert.equal(work.status, 'COMPLETED', 'WORK_COMPLETION_REQUIRED');
  assert.equal(work.tenant_id, actor.tenant_id, 'TENANT_BOUNDARY');
  assert.equal(work.assignee_id, actor.user_id, 'ASSIGNEE_REQUIRED');
  return { work_item_id: work.id, tenant_id: work.tenant_id, provenance: { generated: true, work_item_id: work.id } };
}

let d = createDecision(A);
const work = { id: 'work-a', tenant_id: A.tenant_id, assignee_id: A.user_id, status: 'COMPLETED' };
const approver = { tenant_id: A.tenant_id, user_id: 'approver-a', role: 'manager' };
d = approve(d, approver);
d = execute(d, A, work);
const outcome = recordOutcome(work, A);
assert.equal(d.status, 'EXECUTED');
assert.equal(outcome.provenance.generated, true);

assert.throws(() => execute({ ...createDecision(A), status: 'DRAFT' }, A, work), /APPROVAL_REQUIRED/);
assert.throws(() => approve(createDecision(A), A), /SELF_APPROVAL_FORBIDDEN/);
assert.throws(() => execute(d, B, { ...work, tenant_id: B.tenant_id, assignee_id: B.user_id }), /TERMINAL_STATE|TENANT_BOUNDARY/);
assert.throws(() => recordOutcome({ ...work, status: 'EXECUTING' }, A), /WORK_COMPLETION_REQUIRED/);
assert.throws(() => recordOutcome({ ...work, tenant_id: B.tenant_id }, A), /TENANT_BOUNDARY/);
assert.throws(() => execute(d, A, work), /TERMINAL_STATE|APPROVAL_REQUIRED/);

console.log('decision/outcome e2e matrix: PASS');
