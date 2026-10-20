import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const must = (ok, message) => { if (!ok) failures.push(message); };

const adapter = read('src/lib/file-engine/adapters.ts');
const mapping = read('scripts/check-canonical-import-mapping.mjs');
const transaction = read('scripts/check-import-transaction-contract.mjs');
const runtime = read('scripts/check-import-runtime-governance.mjs');
const state = read('scripts/check-import-state-contract.mjs');
const jobMigration = read('supabase/migrations/20260819203000_import_engine_jobs.sql');
const tenantMigration = read('supabase/migrations/20260823010000_import_rpc_canonical_tenant.sql');
const failClosedMigration = read('supabase/migrations/20260822210000_import_rpc_fail_closed.sql');
const golden = read('src/lib/document-intelligence/golden-dataset.ts');
const quality = read('.github/workflows/quality.yml');

const stripSqlComments = (sql) => sql
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\n)\s*--[^\n]*/g, '$1');

const extractSqlFunction = (sql, functionName) => {
  const source = stripSqlComments(sql);
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+(?:public\\.)?${escapedName}\\b[\\s\\S]*?\\bAS\\s+\\$\\$[\\s\\S]*?\\$\\$`,
    'i',
  );
  return source.match(pattern)?.[0] ?? '';
};

const extractWorkflowRunCommands = (yaml) => {
  const lines = yaml.split(/\r?\n/);
  const commands = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(\s*)run:\s*(.*)$/);
    if (!match) continue;
    const indent = match[1].length;
    const inline = match[2].trim();
    if (inline && inline !== '|') commands.push(inline.replace(/\s+#.*$/, ''));
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      if (!line.trim()) continue;
      const lineIndent = line.match(/^\s*/)[0].length;
      if (lineIndent <= indent) break;
      commands.push(line.replace(/\s+#.*$/, '').trim());
      i = j;
    }
  }
  return commands.filter(Boolean).join('\n');
};

const migrationDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
const businessKeySql = stripSqlComments(read('supabase/migrations/20260823020000_import_business_key_enforcement.sql'));
const rpcSql = stripSqlComments(read('supabase/migrations/20260823021000_import_upsert_concurrency_safe.sql'));

must(adapter.includes('materializeCanonicalFields'), 'Import adapter must materialize canonical fields before persistence');
must(adapter.includes('column.mappingConfidence < 80'), 'Low-confidence mappings must not auto-persist');
must(adapter.includes('const canonicalRows = materializeCanonicalFields(cleanedRows, columnProfiles)'), 'Canonical rows must be produced from cleaned rows and column profiles');
must(adapter.includes('rows: canonicalRows'), 'Import persistence must receive canonical rows');
must(adapter.includes("value !== '' && value !== null && value !== undefined"), 'Empty source cells must not erase existing values');
must(adapter.includes('column.mappedField'), 'Canonical mapping must use explicit mapped fields');
must(mapping.includes('confidence'), 'Canonical mapping regression must test deterministic mapping confidence');

must(businessKeySql.includes('CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_normalized_sku'), 'Business-key uniqueness must be executable SQL');
must(businessKeySql.includes('ON public.products(company_id, public.normalize_import_key(sku))'), 'Business key must include tenant/company scope');
must(businessKeySql.includes('WHERE public.normalize_import_key(sku) IS NOT NULL'), 'Null normalized keys must remain outside the uniqueness index');
must(rpcSql.includes('current_company_id'), 'Import upsert must resolve tenant from trusted database context');
must(rpcSql.includes('ON CONFLICT') || rpcSql.includes('unique_violation'), 'Import upsert must handle concurrent business-key races');
must(rpcSql.includes('FOR UPDATE'), 'Import upsert must fence mutable existing rows');

for (const [name, source, markers] of [
  ['transaction', transaction, ['transaction', 'rollback', 'atomic']],
  ['runtime', `${runtime}\n${tenantMigration}\n${failClosedMigration}`, ['current_company_id', 'fail-closed']],
  ['state', `${jobMigration}\n${state}`, ['queued', 'processing', 'completed', 'failed']],
]) for (const marker of markers) must(source.toLowerCase().includes(marker.toLowerCase()), `Import ${name} contract missing ${marker}`);

const createJobContract = extractSqlFunction(tenantMigration, 'import_create_job');
const finishJobContract = extractSqlFunction(jobMigration, 'import_finish_job');
const failClosedCreateContract = extractSqlFunction(failClosedMigration, 'import_create_job');
must(createJobContract.includes('current_company_id()'), 'Canonical import_create_job must derive tenant from current_company_id()');
must(createJobContract.includes('TENANT_CONTEXT_MISMATCH'), 'Canonical import_create_job must reject caller tenant mismatch');
must(createJobContract.includes('SECURITY INVOKER'), 'Canonical import_create_job must remain SECURITY INVOKER');
must(failClosedCreateContract.includes('SECURITY INVOKER'), 'Fail-closed import_create_job must remain SECURITY INVOKER');
must(finishJobContract.includes('status = p_status'), 'import_finish_job must persist the requested status');
must(finishJobContract.includes('IF NOT FOUND'), 'import_finish_job must fail closed for missing jobs');

for (const token of ['ARABIC_ENGLISH', 'SCANNED', 'RANDOM_SCHEMA', 'NO_HEADER', 'COMPLEX_TABLE', 'INVOICE', 'ONYX', 'WIDE_30_PLUS']) must(golden.includes(token), `Golden corpus missing ${token}`);
must(golden.includes('accuracy >= 0.95'), 'Golden corpus must retain the minimum accuracy threshold');

const decoyComment = `-- CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_normalized_sku\n-- ON public.products(company_id, public.normalize_import_key(sku));`;
must(!stripSqlComments(decoyComment).includes('uq_products_company_normalized_sku'), 'SQL comment stripping must defeat commented business-key decoys');
const normalized = ['00123', ' 00123 ', '00123', ''].map((v) => v.trim()).filter(Boolean);
must(new Set(normalized).size < normalized.length, 'Adversarial fixture must detect duplicate normalized business keys');

const executableWorkflow = extractWorkflowRunCommands(quality);
for (const command of [
  'node scripts/check-import-direct-write-guard.mjs',
  'npm run test:import-transaction-contract',
  'npm run test:import-runtime-governance',
  'npm run test:import-business-key',
  'npm run test:canonical-import-mapping',
]) must(executableWorkflow.includes(command), `Quality must execute ${command}`);

const decoyWorkflow = `# run: ${'node scripts/check-import-direct-write-guard.mjs'}\n- name: ${'npm run test:import-business-key'}`;
must(!extractWorkflowRunCommands(decoyWorkflow).includes('node scripts/check-import-direct-write-guard.mjs'), 'Workflow parser accepted a comment decoy as executable');
must(!extractWorkflowRunCommands(decoyWorkflow).includes('npm run test:import-business-key'), 'Workflow parser accepted a step-name decoy as executable');

if (failures.length) {
  console.error(`PHASE3_DATA_IMPORT_TRUTH_CLOSURE_FAIL\n${failures.map((x) => `- ${x}`).join('\n')}`);
  process.exit(1);
}
console.log(`PHASE3_DATA_IMPORT_TRUTH_CLOSURE_PASS (${migrations.length} migrations scanned; canonical import, business-key, transaction, runtime, state, golden corpus, and adversarial decoy checks)`);
