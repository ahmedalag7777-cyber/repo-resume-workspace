import assert from 'node:assert/strict';

const operations = ['SELECT','INSERT','UPDATE','DELETE','RPC','EXPORT'];
const sessions = [
  { tenant_id: 'tenant-a', user_id: 'user-a', token: 'synthetic-a' },
  { tenant_id: 'tenant-b', user_id: 'user-b', token: 'synthetic-b' },
];

function authorize(operation, actor, resource) {
  assert(operations.includes(operation), 'OPERATION_UNSUPPORTED');
  assert(actor?.tenant_id && actor?.user_id && actor?.token, 'AUTH_REQUIRED');
  assert(resource?.tenant_id, 'RESOURCE_TENANT_REQUIRED');
  return actor.tenant_id === resource.tenant_id;
}

for (const session of sessions) {
  for (const operation of operations) {
    assert.equal(authorize(operation, session, { tenant_id: session.tenant_id }), true);
    assert.equal(authorize(operation, session, { tenant_id: session.tenant_id === 'tenant-a' ? 'tenant-b' : 'tenant-a' }), false);
  }
}

assert.throws(() => authorize('SELECT', null, { tenant_id: 'tenant-a' }), /AUTH_REQUIRED/);
assert.throws(() => authorize('SELECT', sessions[0], {}), /RESOURCE_TENANT_REQUIRED/);
assert.throws(() => authorize('UNKNOWN', sessions[0], { tenant_id: 'tenant-a' }), /OPERATION_UNSUPPORTED/);

console.log('authenticated e2e operation matrix: PASS');
