import fs from 'node:fs/promises';
import process from 'node:process';

const supabaseURL = (process.env.REPORT_ADVISOR_SUPABASE_URL || '').replace(/\/+$/, '');
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const companyId = (process.env.REAL_SMART_REPORT_COMPANY_ID || '').trim();
const timeoutMs = Math.min(Math.max(Number(process.env.E2E_REPORT_CONTEXT_TIMEOUT_MS || 12000), 1000), 30000);
const envFile = process.env.GITHUB_ENV;
const outputFile = process.env.GITHUB_OUTPUT;

if (!supabaseURL || !serviceRoleKey || !companyId || !envFile || !outputFile) {
  throw new Error('E2E_REPORT_CONTEXT_ENV_REQUIRED:URL_SERVICE_ROLE_COMPANY_GITHUB_ENV_OUTPUT');
}

const legacyHash = 'sha256:587f2d3dbdc7ec1ccc8c988ccad72f84b6cf2b794fcbce6711ffe5ecf9d6b313';
const legacyFileName = 'تقارير ادارية.xlsx';
const sha256Pattern = /^sha256:[0-9a-f]{64}$/i;
const supportedPath = /\.(xlsx|xls|xlsm|csv|tsv|ods|pdf|docx|doc|rtf|json|jsonl|xml|yaml|yml|txt|md|markdown|jpg|jpeg|png|webp|tiff|bmp)$/i;

function safeErrorBody(body) {
  try {
    const parsed = JSON.parse(body);
    return String(parsed.code || parsed.error || parsed.message || 'HTTP_ERROR').replace(/[\r\n]+/g, ' ').slice(0, 180);
  } catch {
    return String(body || 'HTTP_ERROR').replace(/[\r\n]+/g, ' ').slice(0, 180);
  }
}

async function restJSON(path, options = {}) {
  const response = await fetch(supabaseURL + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: 'Bearer ' + serviceRoleKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((error) => {
    const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : 'FETCH_ERROR';
    throw new Error('E2E_REPORT_CONTEXT_NETWORK_' + name + ':' + path);
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error('E2E_REPORT_CONTEXT_HTTP_' + response.status + ':' + path + ':' + safeErrorBody(body));
  }
  try {
    return body ? JSON.parse(body) : null;
  } catch {
    throw new Error('E2E_REPORT_CONTEXT_INVALID_JSON:' + path);
  }
}

function isSyntheticRecord(record) {
  const metadata = record && record.metadata && typeof record.metadata === 'object' ? record.metadata : {};
  const fixtureType = String(metadata.fixture_type || '').trim().toLowerCase();
  const catalogId = String(metadata.catalog_id || '').trim().toLowerCase();
  return fixtureType === 'synthetic-realistic' || catalogId === 'report-intelligence.48';
}

function deriveEntityType(job) {
  const key = String(job.job_key || '');
  const marker = ':' + String(job.source_hash || '') + ':';
  const hashMarker = key.indexOf(marker);
  if (!key.startsWith('canonical-import:') || hashMarker <= 'canonical-import:'.length) {
    throw new Error('E2E_REPORT_CONTEXT_JOB_KEY_INVALID:' + String(job.job_id || 'UNKNOWN'));
  }
  return key.slice('canonical-import:'.length, hashMarker);
}

function safeEnvValue(name, value) {
  const text = String(value ?? '');
  if (!text || /[\r\n]/.test(text)) throw new Error('E2E_REPORT_CONTEXT_VALUE_INVALID:' + name);
  return name + '=' + text;
}

const rpcRows = await restJSON('rpc/get_report_value_cohort_candidates', {
  method: 'POST',
  body: JSON.stringify({ p_limit: 100, p_company_id: companyId }),
});
if (!Array.isArray(rpcRows)) throw new Error('E2E_REPORT_CONTEXT_RPC_SHAPE_INVALID');

const candidates = rpcRows
  .filter((job) => {
    const sourcePath = String(job.source_path || '').trim();
    const sourceHash = String(job.source_hash || '').trim();
    const jobKey = String(job.job_key || '');
    const rendered = job.evidence && job.evidence.renderedOutput && typeof job.evidence.renderedOutput === 'object'
      ? job.evidence.renderedOutput
      : {};
    return String(job.company_id || '') === companyId &&
      sha256Pattern.test(sourceHash) &&
      supportedPath.test(sourcePath) &&
      !/^canonical-import:/i.test(sourcePath) &&
      /^canonical-import:generic:/.test(jobKey) &&
      /^[0-9a-f-]{36}$/i.test(String(rendered.importId || ''));
  })
  .filter((job) => String(job.source_hash || '') !== legacyHash &&
    String(job.source_path || '').trim().toLowerCase() !== legacyFileName.toLowerCase())
  .sort((a, b) => {
    const aExt = String(a.source_path || '').match(/\.([^.]+)$/)?.[1]?.toLowerCase() || '';
    const bExt = String(b.source_path || '').match(/\.([^.]+)$/)?.[1]?.toLowerCase() || '';
    const aTabular = ['csv','tsv','json','jsonl','xml','yaml','yml','txt','md','markdown','rtf'].includes(aExt) ? 0 : 1;
    const bTabular = ['csv','tsv','json','jsonl','xml','yaml','yml','txt','md','markdown','rtf'].includes(bExt) ? 0 : 1;
    if (aTabular !== bTabular) return aTabular - bTabular;
    return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
  });
if (!candidates.length) {
  throw new Error('E2E_REPORT_CONTEXT_NO_NONLEGACY_SOURCE: no eligible non-fixture report other than the legacy workbook');
}

const candidateHashes = [...new Set(candidates.map((job) => String(job.source_hash)))];
const hashFilter = 'in.(' + candidateHashes.join(',') + ')';
const fileURL = new URL(supabaseURL + '/rest/v1/file_records');
fileURL.searchParams.set('select', 'id,company_id,file_name,file_hash,metadata,status,security_status');
fileURL.searchParams.set('company_id', 'eq.' + companyId);
fileURL.searchParams.set('file_hash', hashFilter);
const fileRecords = await restJSON('file_records' + fileURL.search, { method: 'GET' });
if (!Array.isArray(fileRecords)) throw new Error('E2E_REPORT_CONTEXT_FILE_RECORDS_SHAPE_INVALID');

const analysisURL = new URL(supabaseURL + '/rest/v1/source_analysis_snapshots');
analysisURL.searchParams.set('select', 'id,company_id,import_job_id,source_hash,analysis_status,row_count,column_count,quality_score,created_at');
analysisURL.searchParams.set('company_id', 'eq.' + companyId);
analysisURL.searchParams.set('source_hash', hashFilter);
analysisURL.searchParams.set('analysis_status', 'eq.analyzed');
analysisURL.searchParams.set('order', 'created_at.desc');
analysisURL.searchParams.set('limit', '500');
const analyses = await restJSON('source_analysis_snapshots' + analysisURL.search, { method: 'GET' });
if (!Array.isArray(analyses)) throw new Error('E2E_REPORT_CONTEXT_ANALYSES_SHAPE_INVALID');

const resolved = [];
for (const job of candidates) {
  const hash = String(job.source_hash);
  const sourcePath = String(job.source_path || '').trim();
  const record = fileRecords.find((row) =>
    String(row.company_id || '') === companyId &&
    String(row.file_hash || '') === hash &&
    String(row.file_name || '').trim() === sourcePath &&
    String(row.security_status || '').toLowerCase() === 'passed' &&
    ['ready','processed','verified'].includes(String(row.status || '').toLowerCase()) &&
    !isSyntheticRecord(row)
  );
  if (!record) continue;
  const evidence = job.evidence && typeof job.evidence === 'object' ? job.evidence : {};
  const rendered = evidence.renderedOutput && typeof evidence.renderedOutput === 'object' ? evidence.renderedOutput : {};
  const importId = String(rendered.importId || '');
  const analysis = analyses.find((row) =>
    String(row.company_id || '') === companyId &&
    String(row.source_hash || '') === hash &&
    String(row.import_job_id || '') === importId &&
    String(row.analysis_status || '').toLowerCase() === 'analyzed'
  );
  if (!analysis) continue;
  const rowCount = Number(analysis.row_count);
  const columnCount = Number(analysis.column_count);
  const qualityScore = Number(analysis.quality_score);
  if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > 1000) continue;
  if (!Number.isInteger(columnCount) || columnCount < 1) continue;
  if (!Number.isFinite(qualityScore)) continue;
  if (Number(rendered.rowCount) !== rowCount) continue;
  if (String(rendered.sourceHash || '') !== hash || rendered.sourceBound !== true) continue;
  let entityType;
  try {
    entityType = deriveEntityType(job);
  } catch {
    continue;
  }
  resolved.push({
    jobId: String(job.job_id),
    companyId,
    sourcePath,
    sourceHash: hash,
    rowCount,
    columnCount,
    entityType,
    qualityScore,
    updatedAt: String(job.updated_at || ''),
    format: sourcePath.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || '',
  });
}
if (!resolved.length) {
  throw new Error('E2E_REPORT_CONTEXT_NO_VERIFIED_NONLEGACY_SOURCE: candidates lacked a non-fixture file record or matching analyzed row set');
}

resolved.sort((a, b) => {
  const aTable = ['csv','tsv','json','jsonl','xml','yaml','yml','txt','md','markdown','rtf'].includes(a.format) ? 0 : 1;
  const bTable = ['csv','tsv','json','jsonl','xml','yaml','yml','txt','md','markdown','rtf'].includes(b.format) ? 0 : 1;
  if (aTable !== bTable) return aTable - bTable;
  return b.updatedAt.localeCompare(a.updatedAt);
});
const selected = resolved[0];

const variables = {
  REAL_SMART_REPORT_JOB_ID: selected.jobId,
  REAL_SMART_REPORT_COMPANY_ID: selected.companyId,
  REAL_SMART_REPORT_SOURCE_PATH: selected.sourcePath,
  REAL_SMART_REPORT_SOURCE_HASH: selected.sourceHash,
  REAL_SMART_REPORT_ROW_COUNT: String(selected.rowCount),
  REAL_SMART_REPORT_COLUMN_COUNT: String(selected.columnCount),
  REAL_SMART_REPORT_ENTITY_TYPE: selected.entityType,
  OPEN_REPORT_EXECUTION_JOB_ID: selected.jobId,
  OPEN_REPORT_EXPECTED_SOURCE_HASH: selected.sourceHash,
  OPEN_REPORT_EXPECTED_ROWS: String(selected.rowCount),
  OPEN_REPORT_FILE_NAME: selected.sourcePath,
  CURRENT_REPORT_SOURCE_PATH: selected.sourcePath,
  CURRENT_REPORT_SOURCE_HASH: selected.sourceHash,
  CURRENT_REPORT_ROW_COUNT: String(selected.rowCount),
  REAL_48_TARGET_JOB_ID: selected.jobId,
  REAL_48_CERTIFIED_JOB_ID: selected.jobId,
  REAL_48_CERTIFIED_COMPANY_ID: selected.companyId,
  REAL_48_CERTIFIED_SOURCE_PATH: selected.sourcePath,
  REAL_48_CERTIFIED_SOURCE_HASH: selected.sourceHash,
};
await fs.appendFile(envFile, Object.entries(variables).map(([name, value]) => safeEnvValue(name, value)).join('\n') + '\n');
await fs.appendFile(outputFile, 'ready=true\n');
console.log(JSON.stringify({
  event: 'E2E_REPORT_CONTEXT_RESOLVED',
  reportJobId: selected.jobId,
  companyId: selected.companyId,
  sourcePath: selected.sourcePath,
  sourceHash: selected.sourceHash,
  rowCount: selected.rowCount,
  columnCount: selected.columnCount,
  entityType: selected.entityType,
  format: selected.format,
  legacyWorkbookExcluded: true,
  syntheticFixtureExcluded: true,
  candidatesChecked: candidates.length,
  eligibleCandidates: resolved.length,
}));
