import assert from 'node:assert/strict';

const REQUIRED = ['tenant_id', 'user_id', 'role', 'access_token'];

function requireAuthenticatedSession(session) {
  assert(session && typeof session === 'object', 'AUTH_SESSION_REQUIRED');
  for (const key of REQUIRED) assert.ok(session[key], `AUTH_SESSION_${key.toUpperCase()}_REQUIRED`);
  assert.equal(typeof session.access_token, 'string', 'AUTH_TOKEN_INVALID');
  return Object.freeze({ ...session });
}

const a = requireAuthenticatedSession({ tenant_id: 'tenant-a', user_id: 'user-a', role: 'manager', access_token: 'synthetic-a' });
const b = requireAuthenticatedSession({ tenant_id: 'tenant-b', user_id: 'user-b', role: 'manager', access_token: 'synthetic-b' });
assert.notEqual(a.tenant_id, b.tenant_id);
assert.notEqual(a.access_token, b.access_token);

for (const missing of REQUIRED) {
  const session = { tenant_id: 'tenant-a', user_id: 'user-a', role: 'manager', access_token: 'token' };
  delete session[missing];
  assert.throws(() => requireAuthenticatedSession(session), new RegExp(missing.toUpperCase()));
}

assert.throws(() => requireAuthenticatedSession(null), /AUTH_SESSION_REQUIRED/);
assert.throws(() => requireAuthenticatedSession({ tenant_id: 'tenant-a', user_id: 'user-a', role: 'manager', access_token: '' }), /ACCESS_TOKEN_REQUIRED/);

// This fixture is a harness contract, not proof of a live authenticated session.
console.log('authenticated e2e session contract: PASS');
