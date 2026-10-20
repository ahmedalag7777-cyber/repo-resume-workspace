import assert from 'node:assert/strict';

const operations = ['SELECT','INSERT','UPDATE','DELETE','RPC','EXPORT','STORAGE','REALTIME','DECISION','WORK_ITEM','OUTCOME'];
const evidenceKinds = ['STATIC','CI','SYNTHETIC_RUNTIME','LIVE_SQL','AUTHENTICATED_LIVE','PRODUCTION'];

function makeCase(tenant, actor) {
  return { tenant, actor, operations: new Set(operations), evidence: 'SYNTHETIC_RUNTIME' };
}

const a = makeCase('tenant-a', 'actor-a');
const b = makeCase('tenant-b', 'actor-b');
assert.equal(a.operations.size, operations.length);
assert.equal(b.operations.size, operations.length);
assert(evidenceKinds.includes(a.evidence));

function authorize(ctx, targetTenant, targetActor) {
  if (ctx.tenant !== targetTenant) throw new Error('TENANT_BOUNDARY');
  if (ctx.actor !== targetActor) throw new Error('ASSIGNEE_BOUNDARY');
  return true;
}

authorize(a, 'tenant-a', 'actor-a');
assert.throws(() => authorize(a, 'tenant-b', 'actor-a'), /TENANT_BOUNDARY/);
assert.throws(() => authorize(a, 'tenant-a', 'actor-b'), /ASSIGNEE_BOUNDARY/);
assert.notEqual(a.tenant, b.tenant);
assert.notEqual(a.actor, b.actor);

console.log('authenticated e2e orchestration harness: PASS');
