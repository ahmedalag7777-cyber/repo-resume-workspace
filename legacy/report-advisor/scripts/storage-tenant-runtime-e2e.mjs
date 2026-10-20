import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseURL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const supabaseURL = (process.env.REPORT_ADVISOR_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY?.trim();
const bucket = process.env.REPORT_ADVISOR_STORAGE_BUCKET?.trim();
const users = [
  { label: 'A', email: process.env.TEST_USER_A_EMAIL?.trim(), password: process.env.TEST_USER_A_PASSWORD },
  { label: 'B', email: process.env.TEST_USER_B_EMAIL?.trim(), password: process.env.TEST_USER_B_PASSWORD },
];
const exactHead = process.env.EXACT_HEAD || 'UNKNOWN';
const reportDir = process.env.E2E_REPORT_DIR || 'artifacts/storage-tenant-runtime';
await fs.mkdir(reportDir, { recursive: true });
const evidence = { exactHead, bucket: bucket || null, status: 'NOT_PROVEN', users: {}, checks: [], startedAt: new Date().toISOString() };

const missingEnv = [];
if (!supabaseURL) missingEnv.push('REPORT_ADVISOR_SUPABASE_URL');
if (!anonKey) missingEnv.push('REPORT_ADVISOR_SUPABASE_ANON_KEY');
if (!bucket) missingEnv.push('REPORT_ADVISOR_STORAGE_BUCKET');
for (const user of users) {
  if (!user.email) missingEnv.push(`TEST_USER_${user.label}_EMAIL`);
  if (!user.password) missingEnv.push(`TEST_USER_${user.label}_PASSWORD`);
}
if (missingEnv.length) {
  evidence.status = 'BLOCKED EXTERNAL';
  evidence.reason = 'Required authenticated storage runtime configuration is not provisioned.';
  evidence.missing = missingEnv;
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(`${reportDir}/result.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
async function browserSession(user) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ar-SA' });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#login-email').fill(user.email);
  await page.locator('#login-password').fill(user.password);

  let authResponse = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    if (attempt > 1) {
      await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.locator('#login-email').fill(user.email);
      await page.locator('#login-password').fill(user.password);
    }
    const authResponsePromise = page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        response.url().includes('/auth/v1/token?grant_type=password'),
      { timeout: 60000 },
    ).catch(() => null);
    const loginSubmit = page.locator('form button[type="submit"]');
    if (!(await loginSubmit.count())) throw new Error('LOGIN_SUBMIT_NOT_FOUND');
    await loginSubmit.click();
    const candidate = await authResponsePromise;
    if (candidate && [429, 500, 502, 503, 504].includes(candidate.status()) && attempt < 6) {
      await page.waitForTimeout(Math.min(5000 * attempt, 20000));
      continue;
    }
    authResponse = candidate;
    if (authResponse || attempt === 6) break;
    await page.waitForTimeout(Math.min(5000 * attempt, 20000));
  }
  if (!authResponse) throw new Error('AUTH_TOKEN_RESPONSE_TIMEOUT');
  const authStatus = authResponse.status();
  if (authStatus >= 400) {
    let detail = '';
    try {
      const body = await authResponse.json();
      detail = body?.error_code || body?.error || body?.msg || body?.message || '';
    } catch {}
    throw new Error('AUTH_TOKEN_HTTP_' + authStatus + (detail ? '_' + detail : ''));
  }

  try {
    await page.locator('#login-email').waitFor({ state: 'hidden', timeout: 30000 });
  } catch {
    const alertText = await page.getByRole('alert').first().textContent().catch(() => '');
    throw new Error('AUTH_UI_SESSION_NOT_ESTABLISHED' + (alertText?.trim() ? ':' + alertText.trim().slice(0, 180) : ''));
  }
  const sessionReady = await page.evaluate(() => Object.entries(localStorage).some(([key, value]) => {
    if (!key.endsWith('-auth-token')) return false;
    try { return Boolean(JSON.parse(value)?.access_token); } catch { return false; }
  }));
  if (!sessionReady) throw new Error('BROWSER_ACCESS_TOKEN_NOT_FOUND_AFTER_AUTH');
  const token = await page.evaluate(() => {
    const raw = Object.entries(localStorage).find(([key]) => key.endsWith('-auth-token'))?.[1];
    if (!raw) throw new Error('BROWSER_SESSION_NOT_FOUND');
    const session = JSON.parse(raw);
    if (!session?.access_token) throw new Error('BROWSER_ACCESS_TOKEN_NOT_FOUND');
    return session.access_token;
  });
  const tenantResponse = await page.evaluate(async ({ url, anon }) => {
    const raw = Object.entries(localStorage).find(([key]) => key.endsWith('-auth-token'))?.[1];
    const session = JSON.parse(raw);
    let last = null;
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const response = await fetch(`${url}/rest/v1/rpc/current_company_id`, {
        method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: '{}',
      });
      const body = await response.text();
      if (response.ok) return { ok: true, status: response.status, body };
      last = { ok: false, status: response.status, body };
      const futureJwt = response.status === 401 && /JWT issued at future/i.test(body);
      const retryable = [502, 503, 504, 544].includes(response.status) || futureJwt;
      if (!retryable || attempt === 12) return last;
      const delayMs = futureJwt ? Math.min(2000 * attempt, 10000) : 3000 * attempt;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return last || { ok: false, status: 599, body: 'tenant resolution exhausted' };
  }, { url: supabaseURL, anon: anonKey });
  assert.equal(tenantResponse.ok, true, `current_company_id failed: ${tenantResponse.status}:${tenantResponse.body}`);
  const tenant = tenantResponse.body.replaceAll('"', '').trim();
  assert.ok(tenant, 'tenant must resolve');
  return { context, page, token, tenant };
}
async function storageRequest(token, method, path, body, headers = {}) {
  const transientStatuses = new Set([502, 503, 504, 544]);
  let last = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(`${supabaseURL}/storage/v1/${path}`, {
      method,
      headers: { apikey: anonKey, Authorization: `Bearer ${token}`, ...headers },
      body,
    });
    const text = await response.text();
    let payload = text; try { payload = JSON.parse(text); } catch {}
    last = { ok: response.ok, status: response.status, payload, attempts: attempt };
    if (response.ok || !transientStatuses.has(response.status) || attempt === 6) return last;
    await new Promise(resolve => setTimeout(resolve, Math.min(1500 * attempt, 10000)));
  }
  return last;
}
async function assertDenied(label, response) {
  const denied = !response.ok;
  evidence.checks.push({ label, status: response.status, result: denied ? 'DENY' : 'UNEXPECTED_ACCESS' });
  assert.equal(denied, true, `${label}: cross-tenant access must be denied`);
}

let sessionA;
let sessionB;
const cleanup = [];
try {
  sessionA = await browserSession(users[0]);
  sessionB = await browserSession(users[1]);
  evidence.users.A = { tenant: sessionA.tenant };
  evidence.users.B = { tenant: sessionB.tenant };
  assert.notEqual(sessionA.tenant, sessionB.tenant, 'Tenant A and Tenant B must be distinct');
  const objectA = `TENANT_A_E2E_${Date.now()}.txt`;
  const objectB = `TENANT_B_E2E_${Date.now()}.txt`;
  const aPath = `${sessionA.tenant}/${objectA}`;
  const bPath = `${sessionB.tenant}/${objectB}`;
  cleanup.push(['A', aPath], ['B', bPath]);

  const uploadA = await storageRequest(sessionA.token, 'POST', `object/${encodeURIComponent(bucket)}/${aPath}`, Buffer.from(`storage-e2e ${exactHead}`), { 'content-type': 'text/plain', 'x-upsert': 'false' });
  assert.equal(uploadA.ok, true, `Tenant A upload failed: ${uploadA.status}:${JSON.stringify(uploadA.payload)}`);
  evidence.checks.push({ label: 'Tenant A upload', status: uploadA.status, result: 'PASS' });

  const listA = await storageRequest(sessionA.token, 'POST', `object/list/${encodeURIComponent(bucket)}`, JSON.stringify({ prefix: `${sessionA.tenant}/`, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } }), { 'content-type': 'application/json' });
  assert.equal(listA.ok, true, `Tenant A list failed: ${listA.status}`);
  const listANames = Array.isArray(listA.payload) ? listA.payload.map(item => item.name) : [];
  assert.ok(listANames.includes(objectA), 'Tenant A must list its own object');
  evidence.checks.push({ label: 'Tenant A list', status: listA.status, result: 'PASS' });

  const readA = await storageRequest(sessionA.token, 'GET', `object/${encodeURIComponent(bucket)}/${aPath}`);
  assert.equal(readA.ok, true, `Tenant A read failed: ${readA.status}`);
  evidence.checks.push({ label: 'Tenant A read', status: readA.status, result: 'PASS' });

  await assertDenied('Tenant B read Tenant A object', await storageRequest(sessionB.token, 'GET', `object/${encodeURIComponent(bucket)}/${aPath}`));
  const crossList = await storageRequest(sessionB.token, 'POST', `object/list/${encodeURIComponent(bucket)}`, JSON.stringify({ prefix: `${sessionA.tenant}/`, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } }), { 'content-type': 'application/json' });
  if (crossList.ok && Array.isArray(crossList.payload)) {
    const exposed = crossList.payload.some(item => item.name === objectA);
    evidence.checks.push({ label: 'Tenant B list Tenant A prefix', status: crossList.status, result: exposed ? 'UNEXPECTED_ACCESS' : 'DENY_EFFECTIVE_EMPTY' });
    assert.equal(exposed, false, 'Tenant B must not enumerate Tenant A object');
  } else {
    evidence.checks.push({ label: 'Tenant B list Tenant A prefix', status: crossList.status, result: 'DENY' });
  }
  const tenantBDeleteA = await storageRequest(sessionB.token, 'DELETE', `object/${encodeURIComponent(bucket)}`, JSON.stringify({ prefixes: [aPath] }), { 'content-type': 'application/json' });
  if (tenantBDeleteA.ok) {
    const stillReadableByA = await storageRequest(sessionA.token, 'GET', `object/${encodeURIComponent(bucket)}/${aPath}`);
    assert.equal(stillReadableByA.ok, true, 'Tenant B delete response must not remove Tenant A object');
    evidence.checks.push({ label: 'Tenant B delete Tenant A object', status: tenantBDeleteA.status, result: 'DENY_EFFECTIVE_OBJECT_PRESERVED' });
  } else {
    await assertDenied('Tenant B delete Tenant A object', tenantBDeleteA);
  }

  const uploadB = await storageRequest(sessionB.token, 'POST', `object/${encodeURIComponent(bucket)}/${bPath}`, Buffer.from('tenant-b'), { 'content-type': 'text/plain', 'x-upsert': 'false' });
  assert.equal(uploadB.ok, true, `Tenant B upload failed: ${uploadB.status}:${JSON.stringify(uploadB.payload)}`);
  evidence.checks.push({ label: 'Tenant B upload', status: uploadB.status, result: 'PASS' });
  const readB = await storageRequest(sessionB.token, 'GET', `object/${encodeURIComponent(bucket)}/${bPath}`);
  assert.equal(readB.ok, true, `Tenant B read failed: ${readB.status}`);
  evidence.checks.push({ label: 'Tenant B read', status: readB.status, result: 'PASS' });
  await assertDenied('Tenant A read Tenant B object', await storageRequest(sessionA.token, 'GET', `object/${encodeURIComponent(bucket)}/${bPath}`));
  const tenantADeleteB = await storageRequest(sessionA.token, 'DELETE', `object/${encodeURIComponent(bucket)}`, JSON.stringify({ prefixes: [bPath] }), { 'content-type': 'application/json' });
  if (tenantADeleteB.ok) {
    const stillReadableByB = await storageRequest(sessionB.token, 'GET', `object/${encodeURIComponent(bucket)}/${bPath}`);
    assert.equal(stillReadableByB.ok, true, 'Tenant A delete response must not remove Tenant B object');
    evidence.checks.push({ label: 'Tenant A delete Tenant B object', status: tenantADeleteB.status, result: 'DENY_EFFECTIVE_OBJECT_PRESERVED' });
  } else {
    await assertDenied('Tenant A delete Tenant B object', tenantADeleteB);
  }

  const deleteA = await storageRequest(sessionA.token, 'DELETE', `object/${encodeURIComponent(bucket)}`, JSON.stringify({ prefixes: [aPath] }), { 'content-type': 'application/json' });
  assert.equal(deleteA.ok, true, `Tenant A delete failed: ${deleteA.status}`);
  evidence.checks.push({ label: 'Tenant A delete', status: deleteA.status, result: 'PASS' });
  const deleteB = await storageRequest(sessionB.token, 'DELETE', `object/${encodeURIComponent(bucket)}`, JSON.stringify({ prefixes: [bPath] }), { 'content-type': 'application/json' });
  assert.equal(deleteB.ok, true, `Tenant B delete failed: ${deleteB.status}`);
  evidence.checks.push({ label: 'Tenant B delete', status: deleteB.status, result: 'PASS' });
  evidence.status = 'PASS';
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  evidence.status = /Bucket not found|bucket/i.test(message) ? 'BLOCKED EXTERNAL' : 'FAIL';
  evidence.error = message;
  if (evidence.status === 'FAIL') process.exitCode = 1; else process.exitCode = 2;
} finally {
  if (sessionA && sessionB) {
    for (const [label, objectPath] of cleanup.reverse()) {
      const session = label === 'A' ? sessionA : sessionB;
      await storageRequest(session.token, 'DELETE', `object/${encodeURIComponent(bucket)}`, JSON.stringify({ prefixes: [objectPath] }), { 'content-type': 'application/json' }).catch(() => {});
    }
  }
  await sessionA?.context.close().catch(() => {});
  await sessionB?.context.close().catch(() => {});
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(`${reportDir}/result.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  await browser.close();
}
console.log(JSON.stringify(evidence, null, 2));

