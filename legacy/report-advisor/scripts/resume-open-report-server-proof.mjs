const SUPABASE_URL = process.env.REPORT_ADVISOR_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY;
const EMAIL = process.env.OPEN_REPORT_TEST_USER_EMAIL || process.env.TEST_USER_A_EMAIL;
const PASSWORD = process.env.OPEN_REPORT_TEST_USER_PASSWORD || process.env.TEST_USER_A_PASSWORD;
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
const JOB_ID = process.env.OPEN_REPORT_EXECUTION_JOB_ID;
const EXPECTED_HASH = process.env.OPEN_REPORT_EXPECTED_SOURCE_HASH;
const EXPECTED_ROWS_ENV = Number(process.env.OPEN_REPORT_EXPECTED_ROWS ?? '0');
const EXPECTED_FILE = process.env.OPEN_REPORT_FILE_NAME;

function required(name, value) {
  if (!value) throw new Error(name + '_MISSING');
  return value;
}
required('REPORT_ADVISOR_SUPABASE_URL', SUPABASE_URL);
required('REPORT_ADVISOR_SUPABASE_ANON_KEY', SUPABASE_ANON_KEY);
required('TEST_USER_A_EMAIL', EMAIL);
required('TEST_USER_A_PASSWORD', PASSWORD);
required('OPEN_REPORT_EXECUTION_JOB_ID', JOB_ID);
required('OPEN_REPORT_EXPECTED_SOURCE_HASH', EXPECTED_HASH);
required('OPEN_REPORT_FILE_NAME', EXPECTED_FILE);
if (!Number.isFinite(EXPECTED_ROWS_ENV) || EXPECTED_ROWS_ENV < 0) throw new Error('OPEN_REPORT_EXPECTED_ROWS_INVALID');

async function supabaseFetch(path, init = {}) {
  const response = await fetch(SUPABASE_URL + path, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error('SUPABASE_HTTP_' + response.status + ':' + text.slice(0, 700));
  return { response, body };
}

async function rest(path, accessToken, init = {}) {
  return supabaseFetch('/rest/v1' + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + accessToken,
      ...(init.headers ?? {}),
    },
  });
}

const auth = await supabaseFetch('/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const accessToken = required('ACCESS_TOKEN', auth.body?.access_token);

// Query the target job ID under the user's JWT before choosing a company context.
 // Postgres RLS must return the row only to an authorized member of its owning tenant.
 // The current/default company can legitimately differ from a saved report's owner.
const before = await rest(
  '/report_execution_jobs?id=eq.' + encodeURIComponent(JOB_ID) +
  '&select=id,company_id,status,source_path,source_hash,job_key,checkpoint,evidence',
  accessToken,
);
const beforeJob = before.body?.[0];
if (!beforeJob) throw new Error('OPEN_REPORT_JOB_NOT_FOUND_OR_NOT_AUTHORIZED');
if (before.body.length !== 1) throw new Error('OPEN_REPORT_JOB_ID_NOT_UNIQUE');
const companyId = required('REPORT_JOB_COMPANY_ID', beforeJob.company_id);
if (beforeJob.source_path !== EXPECTED_FILE) throw new Error('OPEN_REPORT_SOURCE_PATH_MISMATCH');
if (beforeJob.source_hash !== EXPECTED_HASH) throw new Error('OPEN_REPORT_SOURCE_HASH_MISMATCH');

console.log(JSON.stringify({
  phase: 'RESUME_PREFLIGHT',
  jobId: beforeJob.id,
  status: beforeJob.status,
  sourcePath: beforeJob.source_path,
  sourceHash: beforeJob.source_hash,
  jobKey: beforeJob.job_key,
  checkpoint: beforeJob.checkpoint,
  evidence: beforeJob.evidence,
}, null, 2));

const run = await fetch(BASE_URL + '/api/canonical-import-execute', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + accessToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ resumeReportExecutionJobId: JOB_ID }),
});
const runText = await run.text();
let runBody = null;
try { runBody = runText ? JSON.parse(runText) : null; } catch {}
if (!run.ok && run.status !== 202) {
  throw new Error('OPEN_REPORT_RESUME_FAILED_HTTP_' + run.status + ':' + runText.slice(0, 1200));
}
if (run.status !== 202 && (runBody?.jobId !== JOB_ID || runBody?.sourceHash !== EXPECTED_HASH || (EXPECTED_ROWS_ENV > 0 && Number(runBody?.authoritativeRowCount) !== EXPECTED_ROWS_ENV))) {
  throw new Error('OPEN_REPORT_RESUME_SYNCHRONOUS_RESPONSE_INVALID');
}

const checkpointImportId = Array.isArray(beforeJob.checkpoint?.evidenceKeys)
  ? beforeJob.checkpoint.evidenceKeys.map(String).find((key) => key.startsWith('import:'))?.slice(7) ?? ''
  : '';
if (!checkpointImportId) throw new Error('OPEN_REPORT_IMPORT_ID_MISSING_FROM_CHECKPOINT');

const deadline = Date.now() + 180_000;
let polledJob = null;
let recoveredAnalysis = null;
let recoveredImport = null;
while (Date.now() < deadline) {
  const poll = await rest(
    '/report_execution_jobs?id=eq.' + encodeURIComponent(JOB_ID) +
    '&company_id=eq.' + encodeURIComponent(companyId) +
    '&select=id,status,source_path,source_hash,job_key,checkpoint,evidence',
    accessToken,
  );
  polledJob = poll.body?.[0] ?? null;
  if (polledJob?.status === 'dead_letter' || polledJob?.status === 'failed') {
    throw new Error('OPEN_REPORT_BACKGROUND_EXECUTION_FAILED:' + JSON.stringify(polledJob));
  }

  const observedRows = Number(
    polledJob?.evidence?.renderedOutput?.authoritativeCurrentRowCount ??
    polledJob?.evidence?.renderedOutput?.rowCount ??
    polledJob?.checkpoint?.evidenceKeys?.map(String).find((key) => key.startsWith('rows:'))?.slice(5) ??
    0,
  );

  const analysisPoll = await rest(
    '/source_analysis_snapshots?company_id=eq.' + encodeURIComponent(companyId) +
    '&source_hash=eq.' + encodeURIComponent(EXPECTED_HASH) +
    '&analysis_status=eq.analyzed' +
    '&select=id,row_count,column_count,source_format,analysis_status' +
    '&order=created_at.desc&limit=1',
    accessToken,
  );
  recoveredAnalysis = analysisPoll.body?.[0] ?? null;

  const importPoll = await rest(
    '/import_jobs?id=eq.' + encodeURIComponent(checkpointImportId) +
    '&company_id=eq.' + encodeURIComponent(companyId) +
    '&select=id,status,total_rows,processed_rows,valid_rows,invalid_rows,source_fingerprint',
    accessToken,
  );
  recoveredImport = importPoll.body?.[0] ?? null;

  const analysisReady = Boolean(
    recoveredAnalysis &&
    Number(recoveredAnalysis.row_count) > 0 &&
    (observedRows === 0 || Number(recoveredAnalysis.row_count) === observedRows),
  );
  const importReady = Boolean(
    recoveredImport &&
    recoveredImport.status === 'completed' &&
    Number(recoveredImport.valid_rows) === Number(recoveredAnalysis?.row_count ?? observedRows),
  );

  if (
    polledJob?.status === 'completed' &&
    polledJob?.checkpoint?.stage === 'rendered' &&
    analysisReady &&
    importReady
  ) {
    break;
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (!polledJob || polledJob.status !== 'completed' || polledJob.checkpoint?.stage !== 'rendered') {
  throw new Error('OPEN_REPORT_BACKGROUND_EXECUTION_TIMEOUT');
}
if (!recoveredAnalysis || !recoveredImport) {
  throw new Error('OPEN_REPORT_RECOVERY_PERSISTENCE_TIMEOUT');
}
if (polledJob.source_hash !== EXPECTED_HASH) throw new Error('OPEN_REPORT_RESUME_HASH_MISMATCH');

const after = await rest(
  '/report_execution_jobs?id=eq.' + encodeURIComponent(JOB_ID) +
  '&company_id=eq.' + encodeURIComponent(companyId) +
  '&select=id,status,source_path,source_hash,job_key,checkpoint,evidence',
  accessToken,
);
const job = after.body?.[0];
if (!job || job.status !== 'completed') throw new Error('OPEN_REPORT_JOB_NOT_COMPLETED');
if (job.checkpoint?.stage !== 'rendered') throw new Error('OPEN_REPORT_CHECKPOINT_NOT_RENDERED');
if (!job.evidence?.renderedOutput) throw new Error('OPEN_REPORT_RENDERED_OUTPUT_MISSING');

const authoritativeRowCount = Number(
  job.evidence?.renderedOutput?.rowCount ??
  job.evidence?.renderedOutput?.authoritativeCurrentRowCount ??
  job.checkpoint?.evidenceKeys?.map(String).find((key) => key.startsWith('rows:'))?.slice(5) ??
  0,
);
if (!Number.isInteger(authoritativeRowCount) || authoritativeRowCount < 1) {
  throw new Error('OPEN_REPORT_AUTHORITATIVE_ROW_COUNT_MISSING');
}
if (EXPECTED_ROWS_ENV > 0 && authoritativeRowCount !== EXPECTED_ROWS_ENV) {
  throw new Error('OPEN_REPORT_EXPECTED_ROW_COUNT_MISMATCH:' + authoritativeRowCount);
}

const analysis = await rest(
  '/source_analysis_snapshots?company_id=eq.' + encodeURIComponent(companyId) +
  '&source_hash=eq.' + encodeURIComponent(EXPECTED_HASH) +
  '&row_count=eq.' + authoritativeRowCount +
  '&select=id,row_count,column_count,source_format,analysis_status' +
  '&order=created_at.desc&limit=1',
  accessToken,
);
if (!analysis.body?.[0]) throw new Error('OPEN_REPORT_ANALYSIS_NOT_FOUND');
if (Number(analysis.body[0].row_count) !== authoritativeRowCount) throw new Error('OPEN_REPORT_ANALYSIS_ROW_COUNT_MISMATCH');

const countResponse = await rest(
  '/canonical_dataset_records?company_id=eq.' + encodeURIComponent(companyId) +
  '&source_hash=eq.' + encodeURIComponent(EXPECTED_HASH) +
  '&select=row_number&limit=1',
  accessToken,
  { headers: { Prefer: 'count=exact' } },
);
const contentRange = countResponse.response.headers.get('content-range') ?? '';
const countMatch = contentRange.match(/\/(\d+)$/);
if (!countMatch || Number(countMatch[1]) !== authoritativeRowCount) {
  throw new Error('OPEN_REPORT_CANONICAL_ROW_COUNT_MISMATCH:' + contentRange);
}

const commits = await rest(
  '/canonical_import_commits?company_id=eq.' + encodeURIComponent(companyId) +
  '&source_hash=eq.' + encodeURIComponent(EXPECTED_HASH) +
  '&select=committed_count&order=committed_at.desc&limit=1',
  accessToken,
);
if (!commits.body?.[0] || Number(commits.body[0].committed_count) !== authoritativeRowCount) {
  throw new Error('OPEN_REPORT_CANONICAL_COMMIT_COUNT_MISMATCH');
}

const imports = await rest(
  '/import_jobs?id=eq.' + encodeURIComponent(checkpointImportId) +
  '&company_id=eq.' + encodeURIComponent(companyId) +
  '&select=id,status,total_rows,processed_rows,valid_rows,invalid_rows,source_fingerprint',
  accessToken,
);
const importJob = imports.body?.[0];
if (!importJob || importJob.status !== 'completed' || Number(importJob.valid_rows) !== authoritativeRowCount) {
  throw new Error('OPEN_REPORT_IMPORT_JOB_NOT_COMPLETED_OR_ROW_MISMATCH');
}

const duplicateJobs = await rest(
  '/report_execution_jobs?company_id=eq.' + encodeURIComponent(companyId) +
  '&job_key=eq.' + encodeURIComponent(job.job_key) +
  '&select=id&limit=10',
  accessToken,
);
if (!Array.isArray(duplicateJobs.body) || duplicateJobs.body.length !== 1) {
  throw new Error('OPEN_REPORT_DUPLICATE_JOB_DETECTED:' + JSON.stringify(duplicateJobs.body));
}

console.log(JSON.stringify({
  status: 'PASS',
  report: EXPECTED_FILE,
  jobId: JOB_ID,
  sourceHash: EXPECTED_HASH,
  companyId,
  rowCount: authoritativeRowCount,
  canonicalRowCount: Number(countMatch[1]),
  canonicalCommitCount: Number(commits.body[0].committed_count),
  importStatus: importJob.status,
  checkpoint: job.checkpoint?.stage,
  rendered: Boolean(job.evidence?.renderedOutput),
  duplicateJobs: duplicateJobs.body.length,
}, null, 2));