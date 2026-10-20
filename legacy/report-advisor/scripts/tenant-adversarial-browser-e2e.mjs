import { chromium } from 'playwright';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const supabaseURL = process.env.REPORT_ADVISOR_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const users = [
  { id: 'A', email: process.env.TEST_USER_A_EMAIL, password: process.env.TEST_USER_A_PASSWORD },
  { id: 'B', email: process.env.TEST_USER_B_EMAIL, password: process.env.TEST_USER_B_PASSWORD },
];

function requireEnv() {
  const missing = [
    !supabaseURL && 'SUPABASE_RUNTIME_ENV',
    !supabaseAnonKey && 'SUPABASE_ANON_KEY',
    ...users.flatMap(u => [!u.email && `TEST_USER_${u.id}_EMAIL`, !u.password && `TEST_USER_${u.id}_PASSWORD`]),
  ].filter(Boolean);
  if (missing.length) throw new Error(`E2E_ENV_MISSING:${missing.join(',')}`);
}

async function login(page, user) {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#login-email').fill(user.email);
  await page.locator('#login-password').fill(user.password);
  let authResponse = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (attempt > 1) {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('#login-email').fill(user.email);
      await page.locator('#login-password').fill(user.password);
    }
    const authResponsePromise = page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        response.url().includes('/auth/v1/token?grant_type=password'),
      { timeout: 60000 },
    ).catch(() => null);
    await page.locator('form button[type="submit"]').click();
    const candidate = await authResponsePromise;
    if (candidate && [429, 500, 502, 503, 504].includes(candidate.status()) && attempt < 2) {
      await page.waitForTimeout(2500);
      continue;
    }
    authResponse = candidate;
    if (authResponse || attempt === 2) break;
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
}

async function rest(page, path, init = {}) {
  return page.evaluate(async ({ url, key, path: requestPath, init: requestInit }) => {
    const entry = Object.entries(localStorage).find(([k]) => k.endsWith('-auth-token'))?.[1];
    if (!entry) throw new Error('BROWSER_SESSION_NOT_FOUND');
    const session = JSON.parse(entry);
    if (!session?.access_token) throw new Error('BROWSER_ACCESS_TOKEN_NOT_FOUND');
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${requestPath}`, {
      ...requestInit,
      headers: {
        apikey: key,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...(requestInit.headers || {}),
      },
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: response.status, ok: response.ok, body };
  }, { url: supabaseURL, key: supabaseAnonKey, path, init });
}

async function tenantId(page) {
  const response = await rest(page, 'rpc/current_company_id', { method: 'POST', body: '{}' });
  if (!response.ok) throw new Error(`TENANT_RPC_HTTP_${response.status}`);
  const id = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
  if (!id || id === 'null') throw new Error('TENANT_ID_EMPTY');
  return id.replaceAll('"', '');
}

requireEnv();
const browser = await chromium.launch({ headless: true });
const contexts = [];
const evidence = { startedAt: new Date().toISOString(), baseURL, actors: {}, probes: [] };
try {
  const [ctxA, ctxB] = [await browser.newContext(), await browser.newContext()];
  contexts.push(ctxA, ctxB);
  const [pageA, pageB] = [await ctxA.newPage(), await ctxB.newPage()];
  await login(pageA, users[0]);
  await login(pageB, users[1]);
  const [tenantA, tenantB] = [await tenantId(pageA), await tenantId(pageB)];
  evidence.actors.A = { tenantId: tenantA };
  evidence.actors.B = { tenantId: tenantB };
  if (tenantA === tenantB) throw new Error('TENANT_CONTEXT_COLLISION');

  const source = await rest(pageA, 'products?select=id,name&limit=1', { method: 'GET' });
  if (!source.ok) throw new Error(`SOURCE_PRODUCT_HTTP_${source.status}`);
  if (!Array.isArray(source.body) || !source.body[0]?.id) {
    evidence.probes.push({ id: 'cross-tenant-product', status: 'NOT_PROVEN', reason: 'Tenant A has no product fixture.' });
  } else {
    const product = source.body[0];
    const id = encodeURIComponent(product.id);
    const read = await rest(pageB, `products?id=eq.${id}&select=id,name`, { method: 'GET' });
    const write = await rest(pageB, `products?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ name: product.name }),
    });
    evidence.probes.push({ id: 'cross-tenant-read', status: read.ok && Array.isArray(read.body) && read.body.length === 0 ? 'PASS' : 'FAIL', response: read });
    evidence.probes.push({ id: 'cross-tenant-idempotent-write', status: write.ok && Array.isArray(write.body) && write.body.length === 0 ? 'PASS' : 'FAIL', response: write });
  }

  const routes = ['/import', '/import/analyze', '/decision-experience', '/metrics', '/reports/executive'];
  for (const route of routes) {
    await pageA.goto(`${baseURL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    const status = await pageA.locator('body').innerText().then(t => t.trim() ? 'PASS' : 'FAIL');
    evidence.probes.push({ id: `route:${route}`, status });
  }
  const failures = evidence.probes.filter(p => p.status === 'FAIL');
  const unresolved = evidence.probes.filter(p => p.status === 'NOT_PROVEN');
  evidence.finishedAt = new Date().toISOString();
  console.log(JSON.stringify(evidence, null, 2));
  process.exitCode = failures.length ? 1 : unresolved.length ? 2 : 0;
} finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
}
