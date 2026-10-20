import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const baseURL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const supabaseURL = (process.env.REPORT_ADVISOR_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY?.trim();
const email = process.env.TEST_USER_A_EMAIL?.trim();
const password = process.env.TEST_USER_A_PASSWORD;
const exactHead = process.env.EXACT_HEAD || 'UNKNOWN';
const reportDir = process.env.E2E_REPORT_DIR || 'artifacts/commercial-upwork-demo';
for (const [name, value] of Object.entries({ supabaseURL, anonKey, email, password })) if (!value) throw new Error(`COMMERCIAL_UPWORK_E2E_ENV_MISSING:${name}`);
await fs.mkdir(reportDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ar-SA' });
const page = await context.newPage();
const evidence = { exactHead, baseURL, startedAt: new Date().toISOString(), status: 'NOT_PROVEN', failures: [] };

try {
  page.on('console', msg => { if (msg.type() === 'error') evidence.failures.push(`console:${msg.text()}`); });
  page.on('pageerror', error => evidence.failures.push(`pageerror:${error.message}`));
  page.on('requestfailed', request => { const reason = request.failure()?.errorText || 'unknown'; if (reason !== 'net::ERR_ABORTED') evidence.failures.push(`request:${request.method()} ${request.url()} ${reason}`); });
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);

  let authResponse = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > 1) {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
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
    if (candidate && [429, 500, 502, 503, 504].includes(candidate.status()) && attempt < 3) {
      await page.waitForTimeout(5000 * attempt);
      continue;
    }
    authResponse = candidate;
    if (authResponse || attempt === 3) break;
    await page.waitForTimeout(5000 * attempt);
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
  await page.goto(`${baseURL}/proposal-demo`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#proposal-demo-title').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#proposal-demo-client').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#proposal-demo-requirements').waitFor({ state: 'visible', timeout: 30000 });

  const title = 'Senior Business Intelligence Analyst';
  const client = 'Evidence-First Retail Client';
  const requirements = [
    'Dashboard with sales and financial KPIs',
    'Excel/CSV import and validation',
    'Receivables and aging analysis',
    'Inventory and demand forecasting',
    'Recommendations and decision support',
  ].join('\n');
  await page.locator('#proposal-demo-title').fill(title);
  await page.locator('#proposal-demo-client').fill(client);
  await page.locator('#proposal-demo-requirements').fill(requirements);

  const matchedCount = await page.locator('text=قدرة موجودة').count();
  assert.equal(matchedCount, 5, 'all five supplied requirements should map to existing capabilities');
  const reviewCount = await page.locator('text=يحتاج مراجعة بشرية').count();
  assert.equal(reviewCount, 0, 'known requirements must not be reported as unmatched');

  await page.screenshot({ path: `${reportDir}/proposal-demo.png`, fullPage: true });
  const demoLink = page.getByRole('link', { name: 'العرض الحي' }).first();
  if (await demoLink.count() !== 1) throw new Error('LIVE_DEMO_LINK_NOT_FOUND');
  await demoLink.click();
  await page.waitForURL(url => url.pathname === '/', { timeout: 10000 });
  await page.locator('#proposal-demo-title').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#proposal-demo-client').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#proposal-demo-requirements').waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({ path: `${reportDir}/live-demo-route.png`, fullPage: true });

  await page.goBack({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForURL(url => url.pathname === '/proposal-demo', { timeout: 10000 });
  await page.locator('#proposal-demo-title').fill(title);
  await page.locator('#proposal-demo-client').fill(client);
  await page.locator('#proposal-demo-requirements').fill(requirements);
  assert.equal(await page.locator('#proposal-demo-title').inputValue(), title);
  assert.equal(await page.locator('#proposal-demo-client').inputValue(), client);
  assert.equal(await page.locator('#proposal-demo-requirements').inputValue(), requirements);
  await page.evaluate(() => document.fonts?.ready);
  const pdfPath = `${reportDir}/proposal-demo.pdf`;
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' } });
  const pdfTextPath = `${reportDir}/proposal-demo.txt`;
  execFileSync('pdftotext', [pdfPath, pdfTextPath]);
  const pdfText = await fs.readFile(pdfTextPath, 'utf8');
  assert.match(pdfText, /Senior Business Intelligence Analyst/);
  assert.match(pdfText, /Evidence-First Retail Client/);
  assert.match(pdfText, /Capability Mapping/);
  assert.match(pdfText, /تسلسل العرض الحي/);
  evidence.status = 'PASS';
  evidence.matchedCount = matchedCount;
  evidence.pdf = { verified: true, path: pdfPath };
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

