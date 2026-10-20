import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseURL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const supabaseURL = (process.env.REPORT_ADVISOR_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY?.trim();
const email = process.env.TEST_USER_A_EMAIL?.trim();
const password = process.env.TEST_USER_A_PASSWORD;
const exactHead = process.env.EXACT_HEAD || 'UNKNOWN';
const reportDir = process.env.E2E_REPORT_DIR || 'artifacts/commercial-product-create';
for (const [name, value] of Object.entries({ supabaseURL, anonKey, email, password })) if (!value) throw new Error(`COMMERCIAL_PRODUCT_E2E_ENV_MISSING:${name}`);
await fs.mkdir(reportDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ar-SA' });
const page = await context.newPage();
const evidence = { exactHead, baseURL, startedAt: new Date().toISOString(), status: 'NOT_PROVEN', failures: [] };

function accessToken() { return page.evaluate(() => { const raw = Object.entries(localStorage).find(([key]) => key.endsWith('-auth-token'))?.[1]; if (!raw) throw new Error('BROWSER_SESSION_NOT_FOUND'); const session = JSON.parse(raw); if (!session?.access_token) throw new Error('BROWSER_ACCESS_TOKEN_NOT_FOUND'); return session.access_token; }); }
async function rest(path, init = {}) { const token = await accessToken(); const response = await fetch(`${supabaseURL}/rest/v1/${path}`, { ...init, headers: { apikey: anonKey, Authorization: `Bearer ${token}`, ...(init.headers || {}) } }); const body = await response.text(); if (!response.ok) throw new Error(`REST_${response.status}:${body}`); return body ? JSON.parse(body) : []; }
async function currentTenant() { const token = await accessToken(); let last = null; for (let attempt = 1; attempt <= 5; attempt += 1) { const response = await fetch(`${supabaseURL}/rest/v1/rpc/current_company_id`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }); const body = await response.text(); if (response.ok) { const tenant = body.replaceAll('"', '').trim(); assert.ok(tenant, 'tenant must resolve'); return tenant; } last = `current_company_id HTTP ${response.status}: ${body}`; if (![502, 503, 504, 544].includes(response.status) || attempt === 5) break; await page.waitForTimeout(1500 * attempt); } throw new Error(last || 'current_company_id failed'); }

try {
  page.on('console', msg => { if (msg.type() === 'error') evidence.failures.push(`console:${msg.text()}`); });
  page.on('pageerror', error => evidence.failures.push(`pageerror:${error.message}`));
  page.on('requestfailed', request => { const reason = request.failure()?.errorText || 'unknown'; if (reason !== 'net::ERR_ABORTED') evidence.failures.push(`request:${request.method()} ${request.url()} ${reason}`); });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);

  let authResponse = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    if (attempt > 1) {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('#login-email').fill(email);
      await page.locator('#login-password').fill(password);
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
    await page.waitForTimeout(2500);
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
  evidence.tenant = await currentTenant();
  await page.goto(`${baseURL}/products`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('button', { name: 'منتج جديد' }).waitFor({ state: 'visible', timeout: 30000 });
  const sku = `E2E-PRODUCT-${Date.now()}-${process.pid}`;
  const name = `E2E منتج ${Date.now()}-${process.pid}`;
  await page.getByRole('button', { name: 'منتج جديد' }).click();
  await page.locator('#product-create-sku').fill(sku);
  await page.locator('#product-create-name').fill(name);
  await page.locator('#product-create-unit').fill('قطعة');
  await page.locator('#product-create-cost').fill('10');
  await page.locator('#product-create-selling').fill('15');
  await page.locator('#product-create-min-stock').fill('2');
  await page.locator('#product-create-reorder').fill('3');
  await page.getByRole('button', { name: 'حفظ المنتج' }).click();
  await page.getByRole('status').filter({ hasText: 'تم الحفظ والتحقق' }).waitFor({ state: 'visible', timeout: 30000 });
  const persisted = await rest(`products?select=id,company_id,sku,name,unit,cost_price,selling_price,min_stock,reorder_point&company_id=eq.${evidence.tenant}&sku=eq.${encodeURIComponent(sku)}`);
  assert.equal(persisted.length, 1, 'exactly one persisted product expected');
  assert.equal(persisted[0].company_id, evidence.tenant, 'persisted product must belong to current tenant');
  assert.equal(String(persisted[0].sku), sku);
  assert.equal(String(persisted[0].name), name);
  assert.equal(Number(persisted[0].cost_price), 10);
  assert.equal(Number(persisted[0].selling_price), 15);
  await page.locator('[role=\"dialog\"] form button[type=\"button\"]').filter({ hasText: 'إغلاق' }).click();
  await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 30000 });
  await page.getByRole('textbox', { name: 'بحث عن منتج' }).fill(sku);
  await page.getByText(sku, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  evidence.persisted = persisted[0];
  evidence.status = 'PASS';
} catch (error) {
  evidence.status = 'FAIL';
  evidence.error = error instanceof Error ? error.message : String(error);
  await page.screenshot({ path: `${reportDir}/failure.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(`${reportDir}/result.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
console.log(JSON.stringify(evidence, null, 2));
