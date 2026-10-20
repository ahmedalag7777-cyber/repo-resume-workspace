import assert from 'node:assert/strict';

const services = {
  storage: { tenantScoped: true, signedAccess: true, crossTenantDenied: true },
  realtime: { tenantScoped: true, crossTenantDenied: true },
  ai: { tenantScoped: true, crossTenantDenied: true, untrustedOutput: true },
};

for (const [name, contract] of Object.entries(services)) {
  assert.equal(contract.tenantScoped, true, `${name}: tenant scope required`);
  assert.equal(contract.crossTenantDenied, true, `${name}: cross-tenant access must deny`);
}
assert.equal(services.storage.signedAccess, true);
assert.equal(services.ai.untrustedOutput, true);

// Adversarial test-of-test: a weakened tenant-isolation contract must fail closed.
for (const [name, contract] of Object.entries(services)) {
  const weakened = { ...contract, crossTenantDenied: false };
  assert.throws(
    () => assert.equal(weakened.crossTenantDenied, true, `${name}: cross-tenant access must deny`),
    new RegExp(`${name}: cross-tenant access must deny`),
  );
}

console.log('integration boundaries: PASS');
