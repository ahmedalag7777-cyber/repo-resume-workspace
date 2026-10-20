import assert from 'node:assert/strict';

const tenantA = 'tenant-a';
const tenantB = 'tenant-b';

function authorizeStorage(path, tenant) {
  return path.startsWith(`${tenant}/`);
}
function authorizeRealtime(channel, tenant) {
  return channel === `tenant:${tenant}`;
}
function authorizeAI(vectorTenant, tenant) {
  return vectorTenant === tenant;
}

assert.equal(authorizeStorage(`${tenantA}/doc.pdf`, tenantA), true);
assert.equal(authorizeStorage(`${tenantB}/doc.pdf`, tenantA), false);
assert.equal(authorizeRealtime(`tenant:${tenantA}`, tenantA), true);
assert.equal(authorizeRealtime(`tenant:${tenantB}`, tenantA), false);
assert.equal(authorizeAI(tenantA, tenantA), true);
assert.equal(authorizeAI(tenantB, tenantA), false);

// Missing/ambiguous tenant context must fail closed.
assert.equal(authorizeStorage('doc.pdf', tenantA), false);
assert.equal(authorizeRealtime('global', tenantA), false);
assert.equal(authorizeAI(null, tenantA), false);

console.log('storage/realtime/ai boundary contract: PASS');
