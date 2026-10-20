import assert from 'node:assert/strict';

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const anonKey = process.env.E2E_SUPABASE_ANON_KEY?.trim();
const tenantAId = process.env.E2E_TENANT_A_ID?.trim();
const tenantBId = process.env.E2E_TENANT_B_ID?.trim();
const users = {
  A: { email: process.env.E2E_TENANT_A_EMAIL, password: process.env.E2E_TENANT_A_PASSWORD },
  B: { email: process.env.E2E_TENANT_B_EMAIL, password: process.env.E2E_TENANT_B_PASSWORD },
};

if (!baseUrl || !anonKey || !tenantAId || !tenantBId || tenantAId === tenantBId || !users.A.email || !users.A.password || !users.B.email || !users.B.password) {
  console.log('BLOCKED — OWNER/ENVIRONMENT ACTION: authenticated E2E base URL, anon key, distinct tenant IDs, and A/B credentials are required.');
  process.exit(2);
}

async function login(user) {
  let lastStatus = 599;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    const body = await response.json().catch(() => ({}));
    lastStatus = response.status;
    if (response.ok && body.access_token) return body.access_token;
    const retryable = [429, 500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === 6) break;
    await new Promise(resolve => setTimeout(resolve, Math.min(5000 * attempt, 20000)));
  }
  throw new Error(`authenticated login failed after recovery attempts: ${lastStatus}`);
}

async function probe(token) {
  const response = await fetch(`${baseUrl}/rest/v1/company_memberships?select=company_id,user_id&limit=10`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  assert.equal(response.ok, true, `authenticated tenant probe failed: ${response.status}`);
  const rows = await response.json();
  assert.ok(Array.isArray(rows), 'tenant probe must return rows');
  return rows;
}

const tokenA = await login(users.A);
const tokenB = await login(users.B);
const rowsA = await probe(tokenA);
const rowsB = await probe(tokenB);

assert.ok(rowsA.some(row => row.company_id === tenantAId), 'Tenant A session must resolve Tenant A membership');
assert.ok(rowsB.some(row => row.company_id === tenantBId), 'Tenant B session must resolve Tenant B membership');
assert.equal(rowsA.some(row => row.company_id === tenantBId), false, 'Tenant A session must not expose Tenant B membership');
assert.equal(rowsB.some(row => row.company_id === tenantAId), false, 'Tenant B session must not expose Tenant A membership');

console.log('PASS authenticated login A');
console.log('PASS authenticated login B');
console.log('PASS canonical company_memberships tenant resolution A/B');
console.log('PASS adversarial cross-tenant membership isolation A→B and B→A');
console.log('LIVE AUTHENTICATED TENANT ISOLATION BASELINE VERIFIED');
