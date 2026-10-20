import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const expectedSha = process.env.EXACT_HEAD || 'UNKNOWN';
const supabaseURL = (process.env.REPORT_ADVISOR_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY?.trim();
const email = process.env.TEST_USER_A_EMAIL?.trim();
const password = process.env.TEST_USER_A_PASSWORD;
const resultPath = process.env.E2E_RESULT_PATH || 'artifacts/e2e-business/result.json';

for (const [name, value] of Object.entries({ expectedSha, supabaseURL, anonKey, email, password })) {
  if (!value || value === 'UNKNOWN') throw new Error(`LIVE_EVIDENCE_ENV_MISSING:${name}`);
}

const evidenceRun = JSON.parse(await fs.readFile(resultPath, 'utf8'));
assert.equal(evidenceRun.exactHead, expectedSha, 'live business evidence must bind to the exact candidate SHA');
assert.equal(evidenceRun.status, 'PASS', 'live business browser evidence must already be PASS');
assert.ok(evidenceRun.tenantA, 'live evidence must contain Tenant A resolution');
assert.ok(evidenceRun.persisted?.invoice?.id, 'live evidence must contain the persisted invoice identity');

async function authenticate() {
  const response = await fetch(`${supabaseURL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.text();
  assert.equal(response.ok, true, `Supabase password auth HTTP ${response.status}: ${body}`);
  const session = JSON.parse(body);
  assert.ok(session.access_token, 'authenticated evidence verifier requires a real access token');
  return session.access_token;
}

const token = await authenticate();
const headers = { apikey: anonKey, Authorization: `Bearer ${token}` };

async function restGet(table, query) {
  const url = new URL(`${supabaseURL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers });
  const body = await response.text();
  assert.equal(response.ok, true, `${table} HTTP ${response.status}: ${body}`);
  return body ? JSON.parse(body) : [];
}

async function rpc(name, payload) {
  const response = await fetch(`${supabaseURL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  assert.equal(response.ok, true, `${name} HTTP ${response.status}: ${body}`);
  return body ? JSON.parse(body) : null;
}

const tenantRows = await rpc('current_company_id', {});
const tenantA = String(tenantRows || '').replaceAll('"', '');
assert.equal(tenantA, evidenceRun.tenantA, 'live verifier resolved a different Tenant A context');

const invoiceRows = await restGet('sales_invoices', {
  select: 'id,company_id,invoice_number,total,status',
  id: `eq.${evidenceRun.persisted.invoice.id}`,
});
assert.equal(invoiceRows.length, 1, 'persisted invoice must remain queryable in the live tenant');
assert.equal(invoiceRows[0].company_id, tenantA);
assert.equal(Number(invoiceRows[0].total), Number(evidenceRun.persisted.invoice.total));
assert.match(invoiceRows[0].invoice_number, /^E2E-INV-[A-Za-z0-9-]+$/);

const expectedSourcePath = `invoice-${invoiceRows[0].invoice_number.slice('E2E-INV-'.length)}.csv`;
const startedAt = new Date(evidenceRun.startedAt).getTime();
const finishedAt = new Date(evidenceRun.finishedAt || Date.now()).getTime();
const jobs = await restGet('report_execution_jobs', {
  select: 'id,company_id,job_key,source_path,source_hash,status,checkpoint,evidence,completed_at,updated_at',
  company_id: `eq.${tenantA}`,
  source_path: `eq.${expectedSourcePath}`,
  status: 'eq.completed',
  order: 'updated_at.desc',
  limit: '100',
});
const matchingJobs = jobs.filter(job => {
  const updated = new Date(job.updated_at || 0).getTime();
  return updated >= startedAt && updated <= finishedAt + 120000;
});
assert.equal(matchingJobs.length, 1, `expected exactly one completed durable job for ${expectedSourcePath} in the live E2E window, found ${matchingJobs.length}`);
const job = matchingJobs[0];
assert.equal(job.company_id, tenantA);
assert.equal(job.source_path, expectedSourcePath);
assert.match(job.source_hash, /^sha256:[0-9a-f]{64}$/);
assert.equal(job.checkpoint?.stage, 'rendered');
assert.equal(job.checkpoint?.sourceHash, job.source_hash);
assert.ok(job.completed_at, 'durable job must expose completed_at');
assert.ok(job.evidence && typeof job.evidence === 'object', 'durable job must retain completion evidence');

const asOf = new Date().toISOString().slice(0, 10);
const dashboard = await rpc('get_dashboard_snapshot', { p_months: 6, p_as_of: asOf });
assert.ok(dashboard && typeof dashboard === 'object');
assert.ok(['CALCULATED', 'CONFIRMED', 'INSUFFICIENT_DATA'].includes(dashboard.status));
if (dashboard.totalCost === null) {
  assert.equal(dashboard.grossProfit, null, 'live dashboard must not calculate gross profit without cost evidence');
  assert.equal(dashboard.grossMargin, null, 'live dashboard must not calculate gross margin without cost evidence');
}

const profitability = await rpc('get_profitability_snapshot', { p_as_of: asOf });
assert.ok(profitability && typeof profitability === 'object');
assert.ok(['CALCULATED', 'INSUFFICIENT_DATA'].includes(profitability.status));
if (profitability.status === 'INSUFFICIENT_DATA') {
  assert.equal(profitability.revenue, null);
  assert.equal(profitability.cost, null);
  assert.equal(profitability.gross_profit, null);
  assert.ok(Array.isArray(profitability.reasons) && profitability.reasons.length > 0);
}

const output = {
  evidence_kind: 'live-staging-business-evidence',
  exact_sha: expectedSha,
  authenticated_user: 'TEST_USER_A',
  tenant_id: tenantA,
  persisted_invoice_id: invoiceRows[0].id,
  durable_job_id: job.id,
  durable_job_status: job.status,
  durable_checkpoint_stage: job.checkpoint?.stage,
  durable_source_hash: job.source_hash,
  dashboard_status: dashboard.status,
  dashboard_total_sales: dashboard.totalSales ?? null,
  dashboard_total_cost: dashboard.totalCost ?? null,
  dashboard_gross_profit: dashboard.grossProfit ?? null,
  profitability_status: profitability.status,
  profitability_reasons: profitability.reasons ?? [],
  source_regression_evidence: 'release-evidence/production-regression-results.json',
  source_browser_evidence: resultPath,
  verified_at: new Date().toISOString(),
};
await fs.mkdir('artifacts/live-production-evidence', { recursive: true });
await fs.writeFile('artifacts/live-production-evidence/result.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
