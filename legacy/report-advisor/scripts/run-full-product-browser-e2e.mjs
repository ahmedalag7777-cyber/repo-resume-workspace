import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import process from 'node:process';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const supabaseURL = process.env.REPORT_ADVISOR_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const exactHead = process.env.EXACT_HEAD || 'UNKNOWN';
const reportDir = process.env.E2E_REPORT_DIR || 'artifacts/e2e';
await fs.mkdir(reportDir, { recursive: true });

const REAL_SMART_REPORT_JOB_ID = process.env.REAL_SMART_REPORT_JOB_ID || '16709d80-e012-40ef-9c12-6fd8255897f8';
const REAL_SMART_REPORT_COMPANY_ID = process.env.REAL_SMART_REPORT_COMPANY_ID || '99e33354-cc45-4317-8eb3-0d486b6c5932';
const REAL_SMART_REPORT_SOURCE_HASH = process.env.REAL_SMART_REPORT_SOURCE_HASH || 'sha256:587f2d3dbdc7ec1ccc8c988ccad72f84b6cf2b794fcbce6711ffe5ecf9d6b313';
const REAL_SMART_REPORT_SOURCE_PATH = process.env.REAL_SMART_REPORT_SOURCE_PATH || 'تقارير ادارية.xlsx';

const routes = [
  '/', '/command-center', '/onboarding', '/decision-experience', '/metrics', '/reports',
  '/reports/sales', '/reports/purchases', '/reports/inventory',
  '/reports/inventory-intelligence', '/reports/demand-velocity',
  '/reports/receivables', '/reports/profitability',
  '/reports/smart/' + REAL_SMART_REPORT_JOB_ID + '?sourceHash=' + encodeURIComponent(REAL_SMART_REPORT_SOURCE_HASH),
  '/decision-experience?stage=evidence&reportJobId=' + REAL_SMART_REPORT_JOB_ID + '&sourceHash=' + encodeURIComponent(REAL_SMART_REPORT_SOURCE_HASH),
  '/work-center?reportJobId=' + REAL_SMART_REPORT_JOB_ID + '&sourceHash=' + encodeURIComponent(REAL_SMART_REPORT_SOURCE_HASH),
  '/import', '/data-quality',
  '/analytics', '/analytics/rfm', '/analytics/abc', '/analytics/aging',
  '/intelligence', '/intelligence/recommendations', '/intelligence/forecasts',
  '/intelligence/scenarios', '/customers', '/products', '/inventory',
  '/alternative-groups', '/settings', '/settings/profile',
];

const result = {
  exactHead, baseURL, browser: 'Chromium',
  startedAt: new Date().toISOString(),
  auth: 'NOT_PROVEN', tenant: 'NOT_PROVEN',
  routes: [], findings: [], actions: [], requests: [], failedResponses: [],
  authNetworkProbe: null,
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ar-SA' });
const page = await context.newPage();
const consoleErrors = [];
const failedRequests = [];
const failedResponses = [];
const requests = [];
const pageTelemetryByPage = new WeakMap();

function telemetryFor(targetPage) {
  let telemetry = pageTelemetryByPage.get(targetPage);
  if (!telemetry) {
    telemetry = { pendingDataRequests: new Set(), dataRequestsSeen: 0 };
    pageTelemetryByPage.set(targetPage, telemetry);
  }
  return telemetry;
}
let reportProofContext = null;
let reportProofPage = null;
let reportProofTenant = null;

const REPORT_EXPECTATIONS = new Map([
  ['/reports', ['مركز التقارير', 'بيانات → دليل → قرار']],
  ['/reports/sales', ['تقرير المبيعات', 'إجمالي المبيعات']],
  ['/reports/purchases', ['تقرير المشتريات', 'إجمالي المشتريات']],
  ['/reports/inventory', ['تقرير المخزون', 'عدد الأصناف']],
  ['/reports/inventory-intelligence', ['ذكاء المخزون والمجموعات']],
  ['/reports/demand-velocity', ['حركة الطلب وسرعة الأصناف']],
  ['/reports/receivables', ['تقرير الذمم والتحصيل', 'إجمالي الذمم']],
  ['/reports/profitability', ['تقرير الأرباح والربحية', 'التكلفة']],
  ['/reports/smart/' + REAL_SMART_REPORT_JOB_ID + '?sourceHash=' + encodeURIComponent(REAL_SMART_REPORT_SOURCE_HASH), ['WHAT → WHY → SO WHAT → IMPACT → WHAT NEXT → PROOF', 'التفاصيل الكاملة للتقرير', 'مسار القرار', 'المصدر']],
  ['/decision-experience?stage=evidence&reportJobId=' + REAL_SMART_REPORT_JOB_ID + '&sourceHash=' + encodeURIComponent(REAL_SMART_REPORT_SOURCE_HASH), ['تجربة القرار']],
  ['/work-center?reportJobId=' + REAL_SMART_REPORT_JOB_ID + '&sourceHash=' + encodeURIComponent(REAL_SMART_REPORT_SOURCE_HASH), ['مركز العمل']],
]);
const REPORT_LOADING_MARKERS = [
  'جارٍ تحميل',
  'جارٍ التحميل',
  'تحميل اللقطة التجارية',
  'جارٍ تحميل نتيجة التقرير المصدرّي',
];

function isDataRequest(request) {
  const url = request.url();
  return Boolean(
    (supabaseURL && url.startsWith(supabaseURL)) ||
    url.includes('/rest/v1/') ||
    url.includes('/auth/v1/') ||
    url.includes('/functions/'),
  );
}

function wirePageTelemetry(targetPage) {
  const telemetry = telemetryFor(targetPage);
  targetPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  targetPage.on('pageerror', error => consoleErrors.push(`[pageerror] ${error.message}`));
  targetPage.on('requestfailed', request => {
    telemetry.pendingDataRequests.delete(request);
    const error = request.failure()?.errorText || 'unknown';
    if (error === 'net::ERR_ABORTED') return;
    failedRequests.push({ method: request.method(), url: request.url(), error });
  });
  targetPage.on('requestfinished', request => {
    telemetry.pendingDataRequests.delete(request);
  });
  targetPage.on('response', async response => {
    if (response.status() < 400) return;
    const url = response.url();
    const relevant = !supabaseURL || url.startsWith(supabaseURL) || url.includes('/rest/v1/') || url.includes('/auth/v1/');
    if (!relevant) return;
    const body = await response.text().catch(() => '');
    failedResponses.push({ method: response.request().method(), status: response.status(), url, body: body.slice(0, 2000) });
  });
  targetPage.on('request', request => {
    requests.push({ method: request.method(), url: request.url() });
    if (isDataRequest(request)) {
      telemetry.pendingDataRequests.add(request);
      telemetry.dataRequestsSeen += 1;
    }
  });
}
wirePageTelemetry(page);

async function probeAuthFromNode(email, password) {
  if (!supabaseURL || !supabaseAnonKey) return { status: 'BLOCKED', reason: 'SUPABASE_RUNTIME_ENV_MISSING' };
  const startedAt = Date.now();
  const attempts = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const attemptStarted = Date.now();
    try {
      const response = await fetch(`${supabaseURL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15000),
      });
      const bodyText = await response.text();
      let detail = '';
      if (!response.ok) {
        try {
          const body = JSON.parse(bodyText);
          detail = body?.error_code || body?.error || body?.msg || body?.message || '';
        } catch {}
      }
      attempts.push({ attempt, httpStatus: response.status, durationMs: Date.now() - attemptStarted, detail: detail ? String(detail).slice(0, 180) : undefined });
      if (response.ok) {
        return { status: 'PASS', httpStatus: response.status, durationMs: Date.now() - startedAt, attempts };
      }
    } catch (error) {
      attempts.push({
        attempt,
        durationMs: Date.now() - attemptStarted,
        error: error instanceof Error ? error.name + ':' + error.message.slice(0, 180) : String(error).slice(0, 180),
      });
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
  return { status: 'FAIL', durationMs: Date.now() - startedAt, attempts };
}
async function login(targetPage, email, password) {
  await targetPage.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const loginEmail = targetPage.locator('#login-email');
  await loginEmail.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
    throw new Error('LOGIN_FORM_NOT_READY');
  });
  await loginEmail.fill(email);
  await targetPage.locator('#login-password').fill(password);

  // Browser authentication is the authoritative proof for this browser E2E.
  // Keep the optional Node probe non-blocking so a parallel Auth gateway/rate-limit condition
  // cannot veto a real browser session that successfully receives the password-grant response.
  result.authNetworkProbe = { status: 'NOT_RUN', reason: 'BROWSER_AUTH_AUTHORITATIVE' };

  let authResponse = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > 1) {
      await targetPage.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await targetPage.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
      await targetPage.locator('#login-email').fill(email);
      await targetPage.locator('#login-password').fill(password);
    }
    const authResponsePromise = targetPage.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        response.url().includes('/auth/v1/token?grant_type=password'),
      { timeout: 60000 },
    ).catch(() => null);
    const loginSubmit = targetPage.locator('form button[type="submit"]');
    if (!(await loginSubmit.count())) throw new Error('LOGIN_SUBMIT_NOT_FOUND');
    await loginSubmit.click();
    const candidate = await authResponsePromise;
    if (candidate && [429, 500, 502, 503, 504].includes(candidate.status()) && attempt < 3) {
      await targetPage.waitForTimeout(5000 * attempt);
      continue;
    }
    authResponse = candidate;
    if (authResponse || attempt === 3) break;
    await targetPage.waitForTimeout(5000 * attempt);
  }

  if (!authResponse) {
    throw new Error('AUTH_TOKEN_RESPONSE_TIMEOUT');
  }

  const authStatus = authResponse.status();
  if (authStatus >= 400) {
    let detail = '';
    try {
      const body = await authResponse.json();
      detail = body?.error_code || body?.error || body?.msg || body?.message || '';
    } catch {
      detail = '';
    }
    throw new Error('AUTH_TOKEN_HTTP_' + authStatus + (detail ? '_' + detail : ''));
  }

  try {
    await targetPage.locator('#login-email').waitFor({ state: 'hidden', timeout: 30000 });
  } catch {
    const alertText = await targetPage.getByRole('alert').first().textContent().catch(() => '');
    const loading = await targetPage.getByRole('button', { name: 'جارٍ التحقق...' }).count();
    const detail = alertText?.trim() ? ':' + alertText.trim().slice(0, 180) : '';
    throw new Error(
      loading
        ? 'AUTH_UI_SESSION_CONVERGENCE_TIMEOUT' + detail
        : 'AUTH_UI_SESSION_NOT_ESTABLISHED' + detail,
    );
  }
}

async function authenticatedTenantId(targetPage) {
  if (!supabaseURL || !supabaseAnonKey) throw new Error('SUPABASE_RUNTIME_ENV_MISSING');
  let lastError = null;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      return await targetPage.evaluate(async ({ url, anonKey }) => {
        const entry = Object.entries(localStorage).find(([key]) => key.endsWith('-auth-token'))?.[1];
        if (!entry) throw new Error('BROWSER_SESSION_NOT_FOUND');
        const session = JSON.parse(entry);
        const accessToken = session?.access_token;
        if (!accessToken) throw new Error('BROWSER_ACCESS_TOKEN_NOT_FOUND');
        const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/current_company_id`, {
          method: 'POST',
          headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: '{}',
        });
        const body = await response.text();
        if (!response.ok) throw new Error(`CURRENT_COMPANY_ID_HTTP_${response.status}:${body}`);
        if (!body || body === 'null') throw new Error('CURRENT_COMPANY_ID_EMPTY');
        return body.replaceAll('"', '');
      }, { url: supabaseURL, anonKey: supabaseAnonKey });
    } catch (error) {
      lastError = error;
      if (attempt < 8) await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
    }
  }
  throw lastError || new Error('BROWSER_SESSION_CONVERGENCE_FAILED');
}

async function inspectPage(targetPage) {
  return targetPage.evaluate(() => {
    const text = document.body?.innerText?.trim() || '';
    const visible = selector => [...document.querySelectorAll(selector)].filter(el => {
      const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
    const buttons = visible('button').map(el => (el.innerText || el.getAttribute('aria-label') || '').trim()).filter(Boolean);
    const links = visible('a').map(el => ({ text: (el.innerText || '').trim(), href: el.getAttribute('href') })).filter(x => x.text || x.href);
    const inputs = visible('input,textarea,select').map(el => ({
      tag: el.tagName.toLowerCase(), type: el.getAttribute('type'), name: el.getAttribute('name'),
      id: el.id, placeholder: el.getAttribute('placeholder')
    }));
    return {
      title: document.title, textLength: text.length,
      buttons: [...new Set(buttons)].slice(0, 80), buttonCount: buttons.length,
      linkCount: links.length, links: links.slice(0, 80),
      inputCount: inputs.length, inputs: inputs.slice(0, 80),
    };
  });
}

async function waitForReportSettled(targetPage, route, dataBaseline) {
  const telemetry = telemetryFor(targetPage);
  const expected = REPORT_EXPECTATIONS.get(route);
  if (!expected) return null;

  await targetPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  const deadline = Date.now() + 25000;
  let lastState = null;

  while (Date.now() < deadline) {
    const state = await targetPage.evaluate(({ expected, loadingMarkers, smartReportJobId, smartReportSourceHash, smartReportSourcePath }) => {
      const text = document.body?.innerText?.trim() || '';
      const loading = loadingMarkers.filter(marker => text.includes(marker));
      const matches = expected.map(marker => ({ marker, found: text.includes(marker) }));
      const errors = [...document.querySelectorAll('[role="alert"]')].filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).map(node => (node.textContent || '').trim()).filter(Boolean);
      const busy = [...document.querySelectorAll('[aria-busy="true"]')].some(node => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return {
        textLength: text.length,
        loading,
        matches,
        errors: errors.slice(0, 8),
        busy,
        smartSignalSurfacePresent: text.includes('الإشارات'),
        smartAdvisorSurfacePresent: text.includes('المستشار'),
        smartDecisionChainPresent: Boolean(document.querySelector('[data-testid="smart-report-decision-chain"]')),
        smartDecisionCards: ['what','why','so-what','impact','what-next','proof'].filter(key => Boolean(document.querySelector('[data-testid="smart-report-' + key + '"]'))),
        sourceBoundSurfacePresent: Boolean(document.querySelector('[aria-label="مساحة البيانات الفعلية"]')),
        reportJobLinkPresent: [...document.querySelectorAll('a[href]')].some(link => String(link.getAttribute('href') ?? '').includes('/reports/smart/' + smartReportJobId)),
        smartJobIdPresent: text.includes(smartReportJobId) || [...document.querySelectorAll('a[href]')].some(link => String(link.getAttribute('href') ?? '').includes('/reports/smart/' + smartReportJobId)),
        smartSourceHashPresent: text.includes(smartReportSourceHash) || [...document.querySelectorAll('a[href]')].some(link => String(link.getAttribute('href') ?? '').includes(smartReportSourceHash)),
        realReportJobIdPresent: text.includes(smartReportJobId) || [...document.querySelectorAll('a[href]')].some(link => String(link.getAttribute('href') ?? '').includes('/reports/smart/' + smartReportJobId)),
        realReportSourcePresent: text.includes(smartReportSourcePath),
      };
    }, {
      expected,
      loadingMarkers: REPORT_LOADING_MARKERS,
      smartReportJobId: REAL_SMART_REPORT_JOB_ID,
      smartReportSourceHash: REAL_SMART_REPORT_SOURCE_HASH,
      smartReportSourcePath: REAL_SMART_REPORT_SOURCE_PATH,
    });

    const dataRequestsSeenSinceRoute = telemetry.dataRequestsSeen - dataBaseline;
    const allExpectedFound = state.matches.every(item => item.found) || (
      state.sourceBoundSurfacePresent && state.matches[0]?.found && state.realReportJobIdPresent && state.realReportSourcePresent
    );
    const optionalBackgroundRequest = request => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/current_company_id')) return true;
      if (route === '/reports') {
        return url.includes('/rest/v1/report_execution_jobs') || url.includes('/rest/v1/source_analysis_snapshots');
      }
      return false;
    };
    const criticalPendingDataRequests = [...telemetry.pendingDataRequests].filter(request => !optionalBackgroundRequest(request));
    const isReportsCenter = route === '/reports';
    const isSmartReport = route.startsWith('/reports/smart/' + REAL_SMART_REPORT_JOB_ID);
    const domBackedSmartReadback = isSmartReport && state.smartJobIdPresent && state.smartSourceHashPresent && state.smartDecisionCards.length === 6 && criticalPendingDataRequests.length === 0;
    const dataComplete = (dataRequestsSeenSinceRoute > 0 || domBackedSmartReadback) && criticalPendingDataRequests.length === 0;
    const pendingDataRequestDetails = [...telemetry.pendingDataRequests].slice(0, 20).map(request => ({
      method: request.method(),
      url: request.url(),
    }));
    const realReportOnCenterPresent =
      !isReportsCenter ||
      (state.textLength > 120 && state.realReportSourcePresent);
    const smartSignalSurfacePresent = !isSmartReport || state.smartSignalSurfacePresent;
    const smartAdvisorSurfacePresent = !isSmartReport || state.smartAdvisorSurfacePresent;
    const smartDecisionChainPresent = !isSmartReport || state.smartDecisionChainPresent;
    const smartDecisionCardsComplete = !isSmartReport || state.smartDecisionCards.length === 6;
    const smartJobIdPresent = !isSmartReport || state.smartJobIdPresent;
    const smartSourceHashPresent = !isSmartReport || state.smartSourceHashPresent;
    const noLoading = state.loading.length === 0;
    const noVisibleError = state.errors.length === 0;
    const settled =
      state.textLength > 120 &&
      allExpectedFound &&
      dataComplete &&
      noLoading &&
      noVisibleError &&
      !state.busy &&
      smartSignalSurfacePresent &&
      smartAdvisorSurfacePresent &&
      smartDecisionChainPresent &&
      smartDecisionCardsComplete &&
      smartJobIdPresent &&
      smartSourceHashPresent &&
      realReportOnCenterPresent;

    lastState = {
      ...state,
      dataRequestsSeenSinceRoute,
      pendingDataRequests: telemetry.pendingDataRequests.size,
      criticalPendingDataRequests: criticalPendingDataRequests.length,
      pendingDataRequestDetails,
      settled,
    };
    if (settled) return lastState;
    await targetPage.waitForTimeout(350);
  }

  return lastState || { dataRequestsSeenSinceRoute: telemetry.dataRequestsSeen - dataBaseline, pendingDataRequests: telemetry.pendingDataRequests.size, settled: false };
}

async function waitForRealReportFirstPaint(targetPage, timeoutMs = 8000) {
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  let lastState = null;
  while (Date.now() < deadline) {
    lastState = await targetPage.evaluate(({ sourceName }) => {
      const text = document.body?.innerText?.trim() || '';
      const visibleText = text.length > 120;
      const primaryCardPresent = Boolean(document.querySelector('[data-testid="primary-real-smart-report-card"]'));
      return {
        visibleText,
        primaryCardPresent,
        sourcePresent: text.includes(sourceName),
        textLength: text.length,
      };
    }, {
      sourceName: REAL_SMART_REPORT_SOURCE_PATH,
    });
    if (lastState.visibleText && lastState.primaryCardPresent && lastState.sourcePresent) {
      return {
        proven: true,
        durationMs: Date.now() - startedAt,
        ...lastState,
      };
    }
    await targetPage.waitForTimeout(200);
  }
  return {
    proven: false,
    durationMs: Date.now() - startedAt,
    ...(lastState || { visibleText: false, jobIdPresent: false, sourcePresent: false, textLength: 0 }),
  };
}

async function runWorkspacePersonalizationProbe(targetPage) {
  let convergenceRecovery = false;

  async function convergeSettingsPage() {
    const startedAt = Date.now();
    let lastDiagnostic = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      let response = null;
      let gotoError = null;
      try {
        response = await targetPage.goto(`${baseURL}/settings`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await targetPage.waitForURL(url => new URL(url).pathname === '/settings', { timeout: 15000 }).catch(() => {});
        await targetPage.locator('[data-testid="workspace-editor"]').waitFor({
          state: 'attached',
          timeout: 15000,
        }).catch(() => {});
      } catch (error) {
        gotoError = error instanceof Error ? error.message : String(error);
      }

      await targetPage.waitForTimeout(500 + attempt * 500);

      const diagnostic = await targetPage.evaluate(() => ({
        readyState: document.readyState,
        pathname: window.location.pathname,
        href: window.location.href,
        title: document.title,
        bodyTextLength: document.body?.innerText?.trim()?.length ?? 0,
        rootChildCount: document.getElementById('root')?.childElementCount ?? 0,
        workspaceAnchorCount: document.querySelectorAll('[data-testid="workspace-editor"]').length,
      }));

      lastDiagnostic = {
        attempt,
        responseStatus: response?.status() ?? null,
        gotoError,
        durationMs: Date.now() - startedAt,
        ...diagnostic,
      };

      if (diagnostic.bodyTextLength > 0 && diagnostic.rootChildCount > 0 && diagnostic.workspaceAnchorCount > 0) {
        return { ...lastDiagnostic, recovered: convergenceRecovery };
      }

      convergenceRecovery = true;
    }

    return { ...lastDiagnostic, recovered: convergenceRecovery };
  }

  const convergence = await convergeSettingsPage();
  const workspaceEditor = targetPage.locator('[data-testid="workspace-editor"]');

  if (!(convergence.workspaceAnchorCount > 0)) {
    const diagnostic = await targetPage.evaluate(() => ({
      pathname: window.location.pathname,
      href: window.location.href,
      title: document.title,
      bodyText: (document.body?.innerText || '').slice(0, 1200),
      workspaceAnchorCount: document.querySelectorAll('[data-testid="workspace-editor"]').length,
      workspaceHeadingCount: [...document.querySelectorAll('h1,h2,h3,h4')]
        .filter(node => (node.textContent || '').trim() === 'محرر مساحة العمل').length,
      readyState: document.readyState,
      rootChildCount: document.getElementById('root')?.childElementCount ?? 0,
    }));
    await targetPage.screenshot({ path: reportDir + '/workspace-probe-failure.png', fullPage: true }).catch(() => {});
    throw new Error('WORKSPACE_EDITOR_NOT_CONVERGED:' + JSON.stringify({ convergence, diagnostic }));
  }

  await workspaceEditor.waitFor({ state: 'visible', timeout: 30000 });
  await workspaceEditor.getByRole('heading', { name: 'محرر مساحة العمل', exact: true }).waitFor({ state: 'visible', timeout: 30000 });

  const financePreset = workspaceEditor.getByRole('button').filter({ hasText: 'المالية' }).first();
  await financePreset.waitFor({ state: 'visible', timeout: 15000 });
  await financePreset.click();

  const select = workspaceEditor.locator('select').first();
  await select.selectOption('/reports/profitability');

  const kpiToggle = targetPage.locator('[data-testid="workspace-widget-kpis"] input[type="checkbox"]');
  await kpiToggle.waitFor({ state: 'visible', timeout: 15000 });
  if (await kpiToggle.isChecked()) await kpiToggle.uncheck();
  if (await kpiToggle.isChecked()) throw new Error('WORKSPACE_KPI_VISIBILITY_NOT_TOGGLED');

  const persisted = await targetPage.evaluate(() => {
    const raw = localStorage.getItem('report-advisor.workspace-preferences');
    return raw ? JSON.parse(raw) : null;
  });
  if (persisted?.preset !== 'finance') throw new Error('WORKSPACE_PRESET_NOT_PERSISTED');
  if (persisted?.defaultLandingPath !== '/reports/profitability') throw new Error('WORKSPACE_LANDING_NOT_PERSISTED');
  if (persisted?.dashboardWidgets?.includes('kpis')) throw new Error('WORKSPACE_KPI_VISIBILITY_NOT_PERSISTED');

  await targetPage.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await targetPage.waitForTimeout(750);
  const redirectedPath = new URL(await targetPage.url()).pathname;
  if (redirectedPath !== '/reports/profitability') throw new Error(`WORKSPACE_LANDING_REDIRECT_FAILED:${redirectedPath}`);

  const resetConvergence = await convergeSettingsPage();
  const resetWorkspaceEditor = targetPage.locator('[data-testid="workspace-editor"]');
  await resetWorkspaceEditor.waitFor({ state: 'visible', timeout: 30000 });
  const resetButton = targetPage.getByRole('button', { name: 'إعادة الإعدادات الافتراضية', exact: true });
  await resetButton.waitFor({ state: 'visible', timeout: 30000 });
  await resetButton.click();

  const reset = await targetPage.evaluate(() => {
    const raw = localStorage.getItem('report-advisor.workspace-preferences');
    return raw ? JSON.parse(raw) : null;
  });
  if (reset?.preset !== 'owner-executive') throw new Error('WORKSPACE_RESET_PRESET_FAILED');
  if (reset?.defaultLandingPath !== '/') throw new Error('WORKSPACE_RESET_LANDING_FAILED');
  if (!reset?.dashboardWidgets?.includes('kpis')) throw new Error('WORKSPACE_RESET_WIDGETS_FAILED');

  return {
    status: 'PASS',
    convergenceRecovery: convergence.recovered,
    convergence,
    persistedPreset: persisted.preset,
    persistedLanding: persisted.defaultLandingPath,
    redirectedPath,
    resetPreset: reset.preset,
    resetLanding: reset.defaultLandingPath,
  };
}

function addFinding(id, status, severity, reason, extra = {}) {
  result.findings.push({ id, status, severity, reason, ...extra });
}

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.screenshot({ path: `${reportDir}/00-initial.png`, fullPage: true });
  const email = process.env.TEST_USER_A_EMAIL;
  const password = process.env.TEST_USER_A_PASSWORD;

  if (!email || !password) {
    result.auth = 'BLOCKED'; result.tenant = 'BLOCKED';
    addFinding('E2E-AUTH-001', 'BLOCKED', 'P0', 'Authenticated credentials are not available to the workflow.');
  } else {
    await login(page, email, password);
    await page.screenshot({ path: `${reportDir}/01-after-login.png`, fullPage: true });
    const stillLogin = await page.locator('#login-email').count();
    const tenantMissing = await page.getByText('لم يتم تحديد شركة للمستخدم').count();
    const appError = await page.getByText('حدث خطأ غير متوقع').count();
    let authenticatedTenant = null;

    if (!stillLogin && !tenantMissing && !appError) {
      try {
        authenticatedTenant = await authenticatedTenantId(page);
        result.tenantA = authenticatedTenant;
        result.auth = 'PASS';
        result.tenant = 'PASS';
        addFinding('E2E-AUTH-006', 'PASS', 'P0', 'Browser session established and current tenant resolved through authenticated runtime RPC.', { tenantId: authenticatedTenant });

        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        const refreshedTenant = await authenticatedTenantId(page);
        addFinding('E2E-AUTH-013', refreshedTenant === authenticatedTenant ? 'PASS' : 'FAIL', 'P0',
          refreshedTenant === authenticatedTenant
            ? 'Authenticated browser session and tenant survived an immediate full-page refresh.'
            : `Tenant changed after immediate full-page refresh: ${authenticatedTenant} -> ${refreshedTenant}.`,
          { tenantId: refreshedTenant });
      } catch (error) {
        result.auth = 'NOT_PROVEN';
        addFinding('E2E-AUTH-005', 'NOT_PROVEN', 'P0', 'Login form disappeared but browser session/tenant could not be conclusively resolved.', {
          reasonDetail: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (stillLogin) {
      result.auth = 'FAIL';
      addFinding('E2E-AUTH-002', 'FAIL', 'P0', 'Login did not establish an authenticated UI session.');
    } else if (tenantMissing) {
      result.auth = 'BLOCKED';
      addFinding('E2E-AUTH-003', 'BLOCKED', 'P0', 'Authenticated user has no resolvable active tenant in runtime.');
    } else if (appError) {
      result.auth = 'FAIL';
      addFinding('E2E-AUTH-004', 'FAIL', 'P0', 'Application error boundary rendered after authentication.');
    }

    if (result.auth === 'PASS') {
      const primaryNavLink = page.locator('nav a[href="/import"], aside a[href="/import"]').first();
      let primaryNav = false;
      try {
        await primaryNavLink.waitFor({ state: 'visible', timeout: 15000 });
        primaryNav = true;
      } catch {
        primaryNav = false;
      }
      addFinding(
        'E2E-AUTH-012',
        primaryNav ? 'PASS' : 'NOT_PROVEN',
        'P1',
        primaryNav
          ? 'Authenticated application shell became visible after login and exposed the canonical import route from the navigation shell.'
          : 'Authenticated session is proven, but the navigation shell did not expose the canonical import route within the bounded 15-second convergence window.',
      );

      const emailB = process.env.TEST_USER_B_EMAIL;
      const passwordB = process.env.TEST_USER_B_PASSWORD;
      if (emailB && passwordB && result.tenant === 'PASS') {
        const contextB = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ar-SA' });
        const pageB = await contextB.newPage();
        wirePageTelemetry(pageB);
        try {
          await login(pageB, emailB, passwordB);
          result.tenantB = await authenticatedTenantId(pageB);
          addFinding('E2E-TENANT-003', result.tenantA === result.tenantB ? 'FAIL' : 'PASS', 'P0',
            result.tenantA === result.tenantB
              ? 'Tenant A and Tenant B browser actors resolved to the same tenant.'
              : 'Tenant A and Tenant B browser actors resolved to distinct tenant contexts.');
          await pageB.close().catch(() => {});
          await contextB.close().catch(() => {});
        } catch (error) {
          addFinding('E2E-TENANT-004', 'BLOCKED', 'P0', error instanceof Error ? error.message : String(error));
          await pageB.close().catch(() => {});
          await contextB.close().catch(() => {});
        }
      } else {
        addFinding('E2E-TENANT-005', 'BLOCKED', 'P0', 'Tenant B credentials are not available; A/B isolation cannot be proven.');
      }

      const emailC = process.env.TEST_USER_C_EMAIL;
      const passwordC = process.env.TEST_USER_C_PASSWORD;
      if (emailC && passwordC && result.tenant === 'PASS') {
        reportProofContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ar-SA' });
        reportProofPage = await reportProofContext.newPage();
        wirePageTelemetry(reportProofPage);
        try {
          await login(reportProofPage, emailC, passwordC);
          reportProofTenant = await authenticatedTenantId(reportProofPage);
          addFinding('E2E-REAL-REPORT-TENANT-001',
            reportProofTenant === REAL_SMART_REPORT_COMPANY_ID ? 'PASS' : 'NOT_PROVEN',
            'P0',
            reportProofTenant === REAL_SMART_REPORT_COMPANY_ID
              ? 'Dedicated Smart Report browser actor resolved to the owning tenant of the certified report job.'
              : `Dedicated Smart Report actor tenant mismatch: expected ${REAL_SMART_REPORT_COMPANY_ID}, got ${reportProofTenant}.`,
            { expectedTenantId: REAL_SMART_REPORT_COMPANY_ID, actualTenantId: reportProofTenant });
          if (reportProofTenant !== REAL_SMART_REPORT_COMPANY_ID) {
            await reportProofPage.close().catch(() => {});
            await reportProofContext.close().catch(() => {});
            reportProofPage = null;
            reportProofContext = null;
          }
        } catch (error) {
          addFinding('E2E-REAL-REPORT-TENANT-002', 'BLOCKED', 'P0', error instanceof Error ? error.message : String(error));
          await reportProofPage.close().catch(() => {});
          await reportProofContext.close().catch(() => {});
          reportProofPage = null;
          reportProofContext = null;
        }
      } else {
        addFinding('E2E-REAL-REPORT-TENANT-003', 'BLOCKED', 'P0', 'Dedicated real-report credentials are not available.');
      }

      for (let i = 0; i < routes.length; i += 1) {
        const route = routes[i];
        const usesReportProofTenant =
          Boolean(reportProofPage) &&
          (route === '/reports'
            || route.startsWith('/reports/smart/' + REAL_SMART_REPORT_JOB_ID)
            || route.startsWith('/decision-experience?stage=evidence&reportJobId=' + REAL_SMART_REPORT_JOB_ID)
            || route.startsWith('/work-center?reportJobId=' + REAL_SMART_REPORT_JOB_ID));
        const routePage = usesReportProofTenant ? reportProofPage : page;
        const routeTelemetry = telemetryFor(routePage);
        const beforeErrors = consoleErrors.length;
        const beforeFailed = failedRequests.length;
        const beforeFailedResponses = failedResponses.length;
        const beforeRequests = requests.length;
        routeTelemetry.pendingDataRequests.clear();
        const dataBaseline = routeTelemetry.dataRequestsSeen;
        const started = Date.now();
        let status = 'PASS'; let reason = '';
        let inspection = null;
        let settlement = null;
        let firstPaint = null;
        try {
          const response = await routePage.goto(baseURL + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await routePage.waitForTimeout(250);
          if (route === '/reports') {
            firstPaint = await waitForRealReportFirstPaint(routePage, 8000);
            if (!firstPaint.proven) {
              status = 'NOT_PROVEN';
              reason = '/reports: real report content did not become visible within the first-paint budget.';
            }
          }
          settlement = await waitForReportSettled(routePage, route, dataBaseline);
          const bodyText = (await routePage.locator('body').innerText()).trim();
          const appError = await routePage.getByText('حدث خطأ غير متوقع').count();
          const notFound = await routePage.getByText('الصفحة غير موجودة').count();
          inspection = await inspectPage(routePage);
          if (!response || response.status() >= 400) { status = 'FAIL'; reason = 'HTTP ' + (response?.status() ?? 'NO_RESPONSE'); }
          else if (!bodyText) { status = 'FAIL'; reason = 'Blank body'; }
          else if (appError) { status = 'FAIL'; reason = 'App error boundary'; }
          else if (notFound) { status = 'FAIL'; reason = '404 page'; }
          else if (settlement && !settlement.settled) {
            status = 'NOT_PROVEN';
            reason = route + ': report state did not settle with expected content after bounded wait.';
          } else if (settlement) {
            reason = 'Settled report state proven: data request completed, expected customer content rendered, no loading/error state visible.';
          }
        } catch (error) {
          status = 'FAIL'; reason = error instanceof Error ? error.message : String(error);
        }

        let readback = null;
        if (route.startsWith('/reports/smart/' + REAL_SMART_REPORT_JOB_ID) && status !== 'FAIL') {
          const readbackTelemetry = telemetryFor(routePage);
          // Initial render already settled; isolate refresh readback from prior background requests.
          readbackTelemetry.pendingDataRequests.clear();
          const readbackBaseline = readbackTelemetry.dataRequestsSeen;
          try {
            await routePage.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
            readback = await waitForReportSettled(routePage, route, readbackBaseline);
            if (!readback?.settled) {
              status = 'NOT_PROVEN';
              reason = route + ': Smart Report failed refresh readback settlement.';
            }
          } catch (error) {
            status = 'FAIL';
            reason = route + ': Smart Report refresh readback failed: ' + (error instanceof Error ? error.message : String(error));
          }
        }

        const baseName = String(i + 2).padStart(2, '0') + '-' + (route === '/' ? 'home' : route.slice(1).replace(/[\\/?#%=&:]+/g, '-'));
        const screenshot = settlement?.settled ? reportDir + '/' + baseName + '.png' : reportDir + '/' + baseName + '-unsettled.png';
        await routePage.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
        const routeRequests = requests.slice(beforeRequests).map(x => ({ method: x.method, url: x.url }));
        const routeErrors = consoleErrors.slice(beforeErrors);
        const routeFailed = failedRequests.slice(beforeFailed);
        const routeFailedResponses = failedResponses.slice(beforeFailedResponses);
        result.routes.push({ route, status, reason, durationMs: Date.now() - started, screenshot, firstPaint, settlement, readback,
          consoleErrors: routeErrors, failedRequests: routeFailed, failedResponses: routeFailedResponses, requests: routeRequests, interaction: inspection,
          proofTenant: usesReportProofTenant ? reportProofTenant : result.tenantA });
        result.actions.push({ route, buttonCount: inspection?.buttonCount ?? 0, buttons: inspection?.buttons ?? [],
          inputCount: inspection?.inputCount ?? 0, linkCount: inspection?.linkCount ?? 0 });
        if (status === 'FAIL') addFinding('E2E-ROUTE-' + String(i + 1).padStart(3, '0'), 'FAIL', 'P1', route + ': ' + reason);
        if (status === 'NOT_PROVEN') addFinding('E2E-REPORT-' + String(i + 1).padStart(3, '0'), 'NOT_PROVEN', 'P0', reason, { firstPaint, settlement });
        if (routeFailed.length) addFinding('E2E-NET-' + String(i + 1).padStart(3, '0'), 'FAIL', 'P1',
          route + ': ' + routeFailed.length + ' browser network request(s) failed.', { requests: routeFailed });
        if (routeFailedResponses.length) addFinding('E2E-HTTP-' + String(i + 1).padStart(3, '0'), 'FAIL', 'P1',
          route + ': ' + routeFailedResponses.length + ' relevant HTTP response(s) returned 4xx/5xx.', { responses: routeFailedResponses });
        if (routeErrors.length) addFinding('E2E-CONSOLE-' + String(i + 1).padStart(3, '0'), 'FAIL', 'P1',
          route + ': browser emitted ' + routeErrors.length + ' console/page error(s).', { errors: routeErrors });
      }

      try {
        const workspaceProbe = await runWorkspacePersonalizationProbe(page);
        addFinding('E2E-WORKSPACE-001', 'PASS', 'P1', 'Workspace personalization is proven through real browser interaction, persistence, landing redirect, and reset.', workspaceProbe);
      } catch (error) {
        addFinding('E2E-WORKSPACE-001', 'FAIL', 'P1', `Workspace personalization browser probe failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const beforeRefreshTenant = result.tenantA;
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        const afterRefreshTenant = await authenticatedTenantId(page);
        if (beforeRefreshTenant !== afterRefreshTenant) {
          addFinding('E2E-AUTH-009', 'FAIL', 'P0', `Tenant changed across browser refresh: ${beforeRefreshTenant} -> ${afterRefreshTenant}.`);
        } else addFinding('E2E-AUTH-010', 'PASS', 'P0', 'Authenticated tenant context survived browser refresh.');
      } catch (error) {
        addFinding('E2E-AUTH-011', 'FAIL', 'P0', `Authenticated refresh persistence failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const logout = page.getByRole('button', { name: 'تسجيل الخروج' });
      await logout.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
      if (await logout.count() && await logout.isVisible().catch(() => false)) {
        await logout.click();
        try {
          const loginInput = page.locator('#login-email');
          let loginVisible = false;
          for (let attempt = 0; attempt < 12; attempt += 1) {
            loginVisible = await loginInput.isVisible().catch(() => false);
            if (loginVisible) break;

            const residualAuthToken = await page.evaluate(() =>
              Object.keys(localStorage).some(key => key.endsWith('-auth-token'))
            ).catch(() => true);

            if (!residualAuthToken) {
              await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
              loginVisible = await loginInput.isVisible().catch(() => false);
              if (loginVisible) break;
            }

            await page.waitForTimeout(1000);
          }

          if (!loginVisible) {
            addFinding('E2E-AUTH-007', 'FAIL', 'P1', 'Logout did not return the browser to the unauthenticated login state within the bounded convergence window.');
          } else {
            const residualAuthToken = await page.evaluate(() => Object.keys(localStorage).some(key => key.endsWith('-auth-token')));
            if (residualAuthToken) addFinding('E2E-AUTH-007', 'FAIL', 'P1', 'Logout UI reached login state but an auth token remained in browser storage.');
            else addFinding('E2E-AUTH-008', 'PASS', 'P1', 'Logout returned the browser to the unauthenticated login state and cleared the persisted auth token.');
          }
        } catch (error) {
          addFinding('E2E-AUTH-007', 'FAIL', 'P1', 'Logout convergence probe failed: ' + (error instanceof Error ? error.message : String(error)));
        }
      } else addFinding('E2E-AUTH-009', 'NOT_PROVEN', 'P1', 'Logout control was not available in authenticated UI.');
    }
  }
} catch (error) {
  addFinding('E2E-HARNESS-001', 'FAIL', 'P0', error instanceof Error ? error.message : String(error));
} finally {
  result.finishedAt = new Date().toISOString();
  result.consoleErrors = consoleErrors;
  result.failedRequests = failedRequests;
  result.failedResponses = failedResponses;
  result.requests = requests;
  const browserBlocked = result.findings.some(x => x.status === 'BLOCKED');
  const browserFailed = result.findings.some(x => x.status === 'FAIL') || result.routes.some(x => x.status === 'FAIL');
  const browserNotProven = result.findings.some(x => x.status === 'NOT_PROVEN') ||
    result.auth !== 'PASS' || result.tenant !== 'PASS' ||
    result.routes.length !== routes.length ||
    result.routes.some(x => x.status !== 'PASS');
  result.status = browserFailed ? 'FAIL' : (browserNotProven || browserBlocked ? 'NOT_PROVEN' : 'PASS');
  await fs.writeFile(`${reportDir}/result.json`, JSON.stringify(result, null, 2));
  await browser.close();
}

const counts = [...result.routes, ...result.findings].reduce((acc, x) => { acc[x.status] = (acc[x.status] || 0) + 1; return acc; }, {});
const blocked = result.findings.filter(x => x.status === 'BLOCKED').length;
const failed = result.findings.filter(x => x.status === 'FAIL').length;
const notProven = result.findings.filter(x => x.status === 'NOT_PROVEN').length;
console.log(JSON.stringify({ exactHead: result.exactHead, auth: result.auth, tenant: result.tenant,
  routesExecuted: result.routes.length, routesPassed: result.routes.filter(x => x.status === 'PASS').length,
  routesFailed: result.routes.filter(x => x.status === 'FAIL').length, counts, blocked, failed, notProven,
  findings: result.findings }, null, 2));

// Fail closed: unresolved FAIL or NOT_PROVEN findings are never green.
// BLOCKED remains exit 2 so environment/access blockers are distinguishable from test failures.
process.exitCode = failed || notProven ? 1 : (blocked ? 2 : 0);