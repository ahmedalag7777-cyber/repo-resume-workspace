import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const files = fs.existsSync(migrationDir) ? fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')) : [];
const text = files.map((f) => fs.readFileSync(path.join(migrationDir, f), 'utf8')).join('\n');

const required = [
  /import_jobs/i,
  /import_job_rows/i,
  /(?:finalize|finish[_ ]?job|terminal|completed)/i,
  /(?:rollback|failed|cancel(?:led|lled)?)/i,
  /FOR\s+UPDATE|advisory|lock/i,
  /import_commit_batch/i,
  /any row failure rolls back the whole chunk/i,
];
for (const pattern of required) {
  if (!pattern.test(text)) throw new Error(`Import transaction contract missing: ${pattern}`);
}

const lifecycleMigration = files
  .filter((f) => /import.*(?:job|engine|finish|lifecycle)|security.*import/i.test(f))
  .map((f) => fs.readFileSync(path.join(migrationDir, f), 'utf8'))
  .join('\n');
if (!/(?:status\s*=\s*p_status|p_status)/i.test(lifecycleMigration)) {
  throw new Error('Import transaction lifecycle does not persist terminal status');
}
if (!/failed/i.test(lifecycleMigration) || !/cancelled/i.test(lifecycleMigration)) {
  throw new Error('Import transaction lifecycle must support failed and cancelled states');
}
if (!/IMPORT_TERMINAL_STATUS_REQUIRED/i.test(lifecycleMigration)) {
  throw new Error('Import finalization must reject non-terminal statuses');
}
if (!/p_status\s+NOT\s+IN\s+\(\s*['\"]completed['\"]\s*,\s*['\"]partial['\"]\s*,\s*['\"]failed['\"]\s*,\s*['\"]cancelled['\"]\s*\)/i.test(lifecycleMigration)) {
  throw new Error('Import finalization must enumerate the allowed terminal states');
}
if (!/v_existing_summary/i.test(lifecycleMigration) || !/result_summary\s*=\s*coalesce\(v_existing_summary/i.test(lifecycleMigration)) {
  throw new Error('Import finalization must preserve existing result-summary lineage');
}
if (!/IMPORT_COMPLETED_WITH_ERROR/i.test(lifecycleMigration)) {
  throw new Error('Completed imports must not carry an error state');
}

const canonicalCommitPath = path.join(root, 'src', 'lib', 'import', 'canonical-commit.ts');
if (fs.existsSync(canonicalCommitPath)) {
  const canonical = fs.readFileSync(canonicalCommitPath, 'utf8');
  if (!/resolveCurrentCompanyId\(\)/.test(canonical) || !/import_commit_batch/.test(canonical)) {
    throw new Error('Canonical import must resolve authoritative tenant and commit through the atomic RPC wrapper');
  }
  if (!/p_source_hash\s*:\s*sourceHash/.test(canonical)) {
    throw new Error('Canonical import commit must bind the atomic RPC to the exact source hash');
  }
  if (!/CANONICAL_SOURCE_HASH_MISMATCH/.test(canonical)) {
    throw new Error('Canonical import must reject provenance rows whose source hash differs from the durable source hash');
  }
  if (!/IMPORT_COMMIT_RESULT_MISMATCH/.test(canonical)) {
    throw new Error('Canonical import must verify the durable batch result count and IDs');
  }
}

const adapterPath = path.join(root, 'src', 'lib', 'import', 'canonical-production-adapter.ts');
if (!fs.existsSync(adapterPath)) throw new Error('Canonical durable import adapter is missing');
const adapter = fs.readFileSync(adapterPath, 'utf8');
if (!/runDurableProductionLifecycle/.test(adapter) || !/SupabaseReportExecutionStore/.test(adapter)) {
  throw new Error('Canonical import must use the existing durable production runner/store');
}
if (!/stage === 'committed'\)\s*await commitImportBatch/.test(adapter)) {
  throw new Error('Canonical commit must execute only at the durable committed lifecycle stage');
}
if (/batchSize|for \(let i = 0; i < reconciled\.rows\.length/.test(adapter)) {
  throw new Error('Canonical durable adapter must not reintroduce UI-level batch splitting');
}
if (!/enqueue_report_execution_job/.test(adapter) || !/p_source_hash:\s*input\.sourceHash/.test(adapter)) {
  throw new Error('Canonical durable adapter must enqueue a source-bound durable job');
}
if (!/\/api\/canonical-import-execute/.test(adapter) || !/Authorization:.*accessToken/.test(adapter)) {
  throw new Error('Canonical browser import must route durable worker authority through the authenticated server boundary');
}
if (!/serverExecution\?: boolean/.test(adapter) || !/workerClient\?: SupabaseClient/.test(adapter) || !/dataClient\?: SupabaseClient/.test(adapter)) {
  throw new Error('Canonical durable adapter must separate service-role worker client from authenticated data client');
}
if (/from ['"]@\/lib\//.test(adapter) || /from ['"]@\/lib\//.test(fs.readFileSync(canonicalCommitPath, 'utf8'))) {
  throw new Error('Canonical server execution dependency graph must not require Vite-only @/lib aliases');
}
if (!/await import\('\.\.\/supabase'\)/.test(adapter) || !/await import\('\.\.\/supabase'\)/.test(fs.readFileSync(canonicalCommitPath, 'utf8'))) {
  throw new Error('Browser Supabase client must remain lazy in server-importable canonical modules');
}
if (!/commitImportBatch\(/.test(adapter) ||
    !/client:\s*activeDataClient/.test(adapter) ||
    !/companyId\s*:\s*(?:authoritativeCompanyId|companyId)/.test(adapter) ||
    !/importJobId\s*:\s*input\.importId/.test(adapter)) {
  throw new Error('Canonical import commit must remain tenant-bound to the authenticated data client and source import job');
}
if (!/IMPORT_DURABLE_JOB_ALREADY_RUNNING/.test(adapter)) {
  throw new Error('Canonical durable adapter must fail closed when the same durable import is already running');
}
if (!/qualityApproved: boolean/.test(adapter) || !/qualityApproved/.test(adapter)) {
  throw new Error('Canonical durable adapter must carry explicit quality approval state');
}

const serverAdapterPath = path.join(root, 'netlify', 'functions', 'canonical-import-execute.mts');
if (!fs.existsSync(serverAdapterPath)) throw new Error('Canonical durable import server boundary is missing');
const serverAdapter = fs.readFileSync(serverAdapterPath, 'utf8');
if (!/parseFile\(bytes\.buffer, fileRecord\.file_name/.test(serverAdapter)) {
  throw new Error('Canonical server boundary must re-extract rows from the authoritative source bytes');
}
if (!/reconcileForCanonical\(/.test(serverAdapter)) {
  throw new Error('Canonical server boundary must reconcile authoritative source rows before durable execution');
}
if (!/authoritativeQualityScore/.test(serverAdapter) || !/authoritativeQualityScore < 50/.test(serverAdapter) || !/authoritativeQualityScore < 75/.test(serverAdapter)) {
  throw new Error('Canonical server boundary must enforce authoritative quality gates');
}
if (!/qualityApproved/.test(serverAdapter)) {
  throw new Error('Canonical import quality approval must cross the server boundary');
}
if (!/authoritativeRowCount/.test(serverAdapter) || !/authoritativePreview/.test(serverAdapter)) {
  throw new Error('Canonical server boundary must return authoritative parse evidence for persistence');
}
if (!/const dbBlock =/i.test('noop')) {
  // marker kept intentionally unreachable; avoids accidental future broad replacements
}
const authoritativeParseIndex = serverAdapter.indexOf('const authoritativeDatasets =');
const sourceReadyWriteIndex = serverAdapter.indexOf(".from('file_records')", authoritativeParseIndex);
const verifiedMetadataIndex = serverAdapter.indexOf('const verifiedMetadata =', authoritativeParseIndex);
if (authoritativeParseIndex < 0 || sourceReadyWriteIndex < 0 || verifiedMetadataIndex < 0 || sourceReadyWriteIndex < authoritativeParseIndex || sourceReadyWriteIndex < verifiedMetadataIndex) {
  throw new Error('Source must not be marked ready before authoritative parsing');
}

for (const token of [
  "request.method !== 'POST'",
  "env('SUPABASE_SERVICE_ROLE_KEY')",
  "Authorization",
  "userClient.rpc('current_company_id')",
  "SUPABASE_SERVICE_ROLE_KEY",
  "serverExecution: true",
  "workerClient: serviceClient",
  "dataClient: userClient",
  ".from('import_jobs')",
  ".eq('id', importId)",
  ".eq('company_id', companyId)",
  "mode === 'finalize-source'",
]) {
  if (!serverAdapter.includes(token)) throw new Error(`Canonical server execution boundary missing: ${token}`);
}
if (/grant execute on function public\\.(claim|heartbeat|advance|complete|fail|retry)_report_execution_job[^\\n]*to authenticated/i.test(serverAdapter)) {
  throw new Error('Canonical server boundary must not add authenticated worker RPC grants');
}

const pagePath = path.join(root, 'src', 'pages', 'CanonicalImportPage.tsx');
if (fs.existsSync(pagePath)) {
  const page = fs.readFileSync(pagePath, 'utf8');
  if (!/runCanonicalImportThroughDurableRunner/.test(page) || /import \{[^}]*commitImportBatch/.test(page)) {
    throw new Error('Canonical import UI must route through the durable adapter and not invoke the batch RPC wrapper directly');
  }
  if (!/supabase\.rpc\('import_finish_job'/.test(page)) {
    throw new Error('Canonical import UI must close terminal state only through import_finish_job');
  }
  if (/updateImportRecord\([^\n]*(status:\s*['"](?:completed|failed|partial|cancelled)['"])/.test(page)) {
    throw new Error('Canonical import UI must not directly write terminal import status');
  }
  if (!/const durableSourceHash = `sha256:\$\{fileHash\}`/.test(page)) {
    throw new Error('Canonical import UI must bind the computed file hash to the durable SHA-256 source identity');
  }
  if (!/quality < 50/.test(page) || !/quality < 75 && !qualityApproved/.test(page)) {
    throw new Error('Canonical import UI must enforce the 50% rejection and 50–74% explicit approval gates');
  }
  if (!/renderedOutput/.test(page) || !/المؤشرات المستخرجة من الصفوف الكانونية/.test(page) || !/مخرجات متاحة لهذا المصدر|المخرجات المتاحة لهذا المصدر/.test(page)) {
    throw new Error('Canonical import UI must render the source-bound result after durable completion');
  }
}

const runnerPath = path.join(root, 'src', 'lib', 'report-execution', 'durable-production-runner.ts');
if (fs.existsSync(runnerPath)) {
  const runner = fs.readFileSync(runnerPath, 'utf8');
  const executeIndex = runner.indexOf('await input.executeStage(following');
  const checkpointIndex = runner.indexOf('await store.saveCheckpoint(input.jobId, checkpoint');
  if (executeIndex < 0 || checkpointIndex < 0 || executeIndex > checkpointIndex) {
    throw new Error('Durable runner must persist a checkpoint only after the stage executor succeeds');
  }
}

const batchFolderPath = path.join(root, 'src', 'lib', 'import', 'batch-folder.ts');
if (fs.existsSync(batchFolderPath)) {
  const batch = fs.readFileSync(batchFolderPath, 'utf8');
  if (!/offset\+=500/.test(batch)) throw new Error('Folder import must use bounded atomic chunks');
  if (!/status:'failed'|status\s*:\s*'failed'/.test(batch) || !/updateImportRecord\(importRecordId,\{status:'failed'/.test(batch)) {
    throw new Error('Failed folder imports must persist a terminal failed state');
  }
  if (!/committed\s*,\s*error:message/.test(batch) || !/committed\s*,\s*error\??:message/.test(batch)) {
    throw new Error('Failed folder imports must preserve committed progress and error detail');
  }
}

const forbiddenDirectBulk = /supabase\.from\([^)]*(products|import_job_rows|orders)[^)]*\)\.(insert|upsert|update)\s*\(/is;
const sourceDirs = ['src/lib', 'src/services'];
for (const dir of sourceDirs) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const body = fs.readFileSync(full, 'utf8');
        if (forbiddenDirectBulk.test(body) && !/import-upsert|unified-import/i.test(full)) {
          throw new Error(`Direct bulk write outside governed import path: ${full}`);
        }
      }
    }
  }
}

console.log('Import transaction contract: PASS');

if (!/import_finish_job/.test(adapter)) throw new Error('Canonical durable adapter must finalize import jobs through the governed import_finish_job RPC');
if (!/recovered_from_completed_durable_job/.test(adapter)) throw new Error('Canonical durable adapter must recover completed durable jobs after interrupted client sessions');
if (!/stage === 'rendered'/.test(adapter)) throw new Error('Canonical durable adapter must persist rendered-stage output evidence');
if (!/buildSourceReportMetrics/.test(adapter) || !/sourceMetrics/.test(adapter) || !/missingCustomerRows/.test(adapter) || !/receivableCandidate/.test(adapter)) {
  throw new Error('Canonical rendered output must expose deterministic source metrics from canonical rows');
}

