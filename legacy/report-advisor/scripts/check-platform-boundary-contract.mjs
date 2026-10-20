import assert from 'node:assert/strict';

const resources = ['storage','realtime','ai'];
const sessions = { A: { tenant_id:'tenant-a', user_id:'user-a' }, B:{ tenant_id:'tenant-b', user_id:'user-b' } };

function authorize(resource, actor, targetTenant) {
  assert(resources.includes(resource), 'RESOURCE_UNSUPPORTED');
  assert(actor?.tenant_id && actor?.user_id, 'AUTH_REQUIRED');
  assert(targetTenant, 'TENANT_REQUIRED');
  return actor.tenant_id === targetTenant;
}

for (const resource of resources) {
  assert.equal(authorize(resource, sessions.A, 'tenant-a'), true);
  assert.equal(authorize(resource, sessions.B, 'tenant-b'), true);
  assert.equal(authorize(resource, sessions.A, 'tenant-b'), false);
  assert.equal(authorize(resource, sessions.B, 'tenant-a'), false);
}

assert.throws(() => authorize('unknown', sessions.A, 'tenant-a'), /RESOURCE_UNSUPPORTED/);
assert.throws(() => authorize('storage', null, 'tenant-a'), /AUTH_REQUIRED/);
assert.throws(() => authorize('realtime', sessions.A, ''), /TENANT_REQUIRED/);

console.log('storage/realtime/ai boundary contract: PASS');
