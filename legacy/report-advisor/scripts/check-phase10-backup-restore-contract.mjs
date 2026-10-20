import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20260829023000_restore_import_lifecycle_rpcs.sql');
const evidence = read('scripts/check-production-certification-evidence-integrity.mjs');
const contract = read('scripts/check-production-certification-contract.mjs');
const index = read('docs/MASTER_EXECUTION_INDEX.md');
const phaseFProbe = read('scripts/phase-f-live-resilience-probes.mjs');
const cartsParityMigration = read('supabase/migrations/20260925200000_restore_carts_schema_parity.sql');
const clientUiSettingsParityMigration = read('supabase/migrations/20260925184000_restore_client_ui_settings_schema_parity.sql');



// Source counts and pg_dump must consume the same exported PostgreSQL snapshot.
// The snapshot export uses a safe serializable read-only transaction; imports use the
// resolved transaction-pooler URI so the snapshot id belongs to the same source database.
const phaseFSnapshotHelper = read('src/server/logical-restore-snapshot.mjs');
if (!/const querySource = await preferIpv4Host\(toTransactionPooler\(runnerSource\)\);/.test(phaseFProbe)) {
  throw new Error('Phase-F logical reads must derive an IPv4-safe transaction-pooler querySource from runnerSource');
}
if (!/exportedSnapshot = await startExportedSnapshot\(querySource\)/.test(phaseFProbe)
  || !/buildExportedSnapshotSql\(\)/.test(phaseFProbe)) {
  throw new Error('Phase-F source snapshot must be exported from the resolved querySource URI');
}
if (!/sourceCounts = parseTableCounts\(runDockerPsqlWithSnapshot\(querySource, exportedSnapshot\.snapshotId, countSql\)\)/.test(phaseFProbe)) {
  throw new Error('Phase-F source row counts must import the exported snapshot on querySource');
}
if (!/runDockerPgDump\(querySource, backupPath, exportedSnapshot\.snapshotId\)/.test(phaseFProbe)) {
  throw new Error('Phase-F pg_dump must use the resolved querySource URI and the same exported snapshot id');
}
if (!/function runDockerPgDump\(databaseUrl, outputPath, snapshotId\)/.test(phaseFProbe)
  || !/pg_dump "\$PGURI" --snapshot="\$SNAPSHOT_ID"/.test(phaseFProbe)
  || /pg_dump "\$PGURI" --serializable-deferrable --snapshot="\$SNAPSHOT_ID"/.test(phaseFProbe)) {
  throw new Error('Phase-F pg_dump must import the shared snapshot without READ ONLY DEFERRABLE; the exporter itself must remain SERIALIZABLE READ ONLY DEFERRABLE');
}
if (!/sourceCountsAfter = parseTableCounts\(runDockerPsql\(querySource, countSql\)\)/.test(phaseFProbe)
  || !/source_snapshot_strategy: 'postgres-exported-snapshot-shared-with-pg-dump'/.test(phaseFProbe)) {
  throw new Error('Phase-F post-dump source drift must be diagnostic and snapshot provenance must be recorded');
}
if (!/finally \{\s*if \(exportedSnapshot\) await exportedSnapshot\.close\(\);\s*\}/.test(phaseFProbe)) {
  throw new Error('Phase-F must close the exported snapshot transaction after counts and dump finish');
}
for (const token of [
  'buildExportedSnapshotSql()',
  'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE',
  'pg_export_snapshot()',
  'SET TRANSACTION SNAPSHOT',
]) {
  if (!phaseFSnapshotHelper.includes(token)) throw new Error('Phase-F exported snapshot helper invariant missing: ' + token);
}
if (!/const directPort = parsed\.port \|\| '5432';/.test(phaseFProbe) || !/directPort === '5432'/.test(phaseFProbe)) {
  throw new Error('Phase-F direct Supabase source fallback must treat an omitted port as the default 5432');
}
if (!/const volatileExcludeArgs = \[\.\.\.VOLATILE_RESTORE_TABLES\]/.test(phaseFProbe)
  || !/--exclude-table-data=\$\{tableName\}/.test(phaseFProbe)
  || !/--data-only \$\{volatileExcludeArgs\}/.test(phaseFProbe)) {
  throw new Error('Phase-F logical restore must exclude volatile public rows whose Supabase Auth parent rows are not present in the public-only dump');
}
if (!/const VOLATILE_RESTORE_TABLES = new Set\(\[[\s\S]*?'public\.carts'[\s\S]*?'public\.cart_items'[\s\S]*?\]\)/.test(phaseFProbe)) {
  throw new Error('Phase-F logical restore must exclude both carts and dependent cart_items rows from the public-only data dump');
}

if (!/const authUserIdsSql =/.test(phaseFProbe)
  || !phaseFProbe.includes("c.confrelid = 'auth.users'::regclass")
  || !phaseFProbe.includes('function buildAuthUserStubSql(userIds)')
  || !phaseFProbe.includes('INSERT INTO auth.users (id)')
  || !phaseFProbe.includes("auth_user_stub_mode: 'id-only-ephemeral'")) {
  throw new Error('Phase-F must create ephemeral ID-only Auth placeholders while retaining all public business tables');
}
const authStubBuilderStart = phaseFProbe.indexOf('function buildAuthUserStubSql(userIds)');
const authStubBuilderEnd = phaseFProbe.indexOf('\nfunction verifyRestoredRecommendationAuthority', authStubBuilderStart);
const authStubBuilder = authStubBuilderStart >= 0 && authStubBuilderEnd > authStubBuilderStart
  ? phaseFProbe.slice(authStubBuilderStart, authStubBuilderEnd)
  : '';
if (!authStubBuilder || ['email', 'encrypted_password', 'raw_app_meta_data', 'raw_user_meta_data', 'confirmation_token'].some(field => authStubBuilder.includes(field))) {
  throw new Error('Phase-F Auth placeholders must not copy credentials or personal metadata');
}
const authStubApplyPosition = phaseFProbe.indexOf('runDockerPsqlFileRaw(localDbUrl, authUserStubsPath)');
const publicRestorePosition = phaseFProbe.indexOf('runDockerPsqlFile(localDbUrl, backupPath)');
if (authStubApplyPosition < 0 || publicRestorePosition < 0 || authStubApplyPosition > publicRestorePosition) {
  throw new Error('Phase-F must seed local Auth IDs before restoring business rows and reapplying foreign keys');
}

const stripSqlComments = (sql) => sql
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\n)\s*--[^\n]*/g, '$1');
const executable = stripSqlComments(migration);

const targetGenericReferenceMigration = read('supabase/migrations/20260829175705_harden_cross_tenant_reference_integrity_v2.sql');
const targetGenericReferenceExecutable = stripSqlComments(targetGenericReferenceMigration);
const targetGenericReferenceUpper = targetGenericReferenceExecutable.toUpperCase();
for (const token of [
  'CREATE OR REPLACE FUNCTION PUBLIC.ENFORCE_SAME_COMPANY_REFERENCE()',
  'TENANT_REFERENCE_ARGUMENTS_REQUIRED',
  'TRG_WAREHOUSE_BRANCH_COMPANY',
  "ENFORCE_SAME_COMPANY_REFERENCE('BRANCHES','BRANCH_ID')",
]) if (!targetGenericReferenceUpper.includes(token)) {
  throw new Error(`Missing Phase-F restore-chain generic tenant-reference invariant: ${token}`);
}

const profilesParityUpper = stripSqlComments(cartsParityMigration).toUpperCase();
for (const token of [
  'CREATE TABLE IF NOT EXISTS PUBLIC.PROFILES',
  'ORGANIZATION_ID UUID NOT NULL',
  'CUSTOMER_ID UUID',
  'ROLE TEXT NOT NULL',
  'PROFILES_ID_FKEY',
  'PROFILES_ORGANIZATION_ID_FKEY',
  'PROFILES_CUSTOMER_ID_FKEY',
  'PROFILES_CUSTOMER_IDX',
  'PROFILES_ORG_IDX',
  'PROFILES_SELF_SELECT',
  'GRANT ALL ON TABLE PUBLIC.PROFILES TO SERVICE_ROLE',
]) {
  if (!profilesParityUpper.includes(token)) throw new Error(`Missing profiles schema restore-parity invariant: ${token}`);
}

const cartsParityUpper = stripSqlComments(cartsParityMigration).toUpperCase();

for (const token of [
  'BRANCHES_ID_COMPANY_UNIQUE',
  'BRANCHES_COMPANY_ID_ID_KEY',
  'CASH_ACCOUNTS_COMPANY_ID_FKEY',
  'CASH_ACCOUNTS_BRANCH_COMPANY_FKEY',
  'CASH_ACCOUNTS_CURRENCY_FORMAT',
  'CASH_ACCOUNTS_NONNEGATIVE',
  'IDX_CASH_ACCOUNTS_COMPANY_BRANCH',
  'CASH_ACCOUNTS_TENANT_SELECT',
  'GRANT SELECT ON TABLE PUBLIC.CASH_ACCOUNTS TO AUTHENTICATED',
]) {
  if (!cartsParityUpper.includes(token)) throw new Error(`Missing branch/cash-account restore-parity invariant: ${token}`);
}

const clientUiSettingsParityUpper = stripSqlComments(clientUiSettingsParityMigration).toUpperCase();
for (const token of [
  'CREATE TABLE IF NOT EXISTS PUBLIC.CLIENT_UI_SETTINGS',
  'ORGANIZATION_ID UUID NOT NULL',
  'CONFIG JSONB NOT NULL',
  'CLIENT_UI_SETTINGS_ORGANIZATION_ID_FKEY',
  'CLIENT_UI_SETTINGS_ORGANIZATION_ID_KEY',
  'CLIENT_UI_SETTINGS_CONFIG_SHAPE_CHECK',
  'SHOWSEARCH',
  'SHOWCATEGORIES',
  'SHOWEXCEL',
  'SHOWQUICKORDER',
  'SHOWTEMPLATES',
  'SHOWCREDIT',
  'SHOWINVENTORY',
  'SHOWRETAILPRICE',
  'REQUIREQUANTITYCONFIRMATION',
  'SHOWTIEREDPRICING',
  'SHOWSAVINGSCALCULATOR',
  'SHOWIMAGESEARCH',
  'SHOWVOICESEARCH',
  'SHOWPAYMENTMETHODS',
  'PAYMENTONCREDIT',
  'PAYMENTCASH',
  'PAYMENTTRANSFER',
  'MINORDERVALUE',
  'MAXORDERVALUE',
  'MAXTEMPLATES',
  'ENABLE ROW LEVEL SECURITY',
  'UI_SETTINGS_CUSTOMER_SELECT',
  'ORGANIZATION_ID = PUBLIC.CURRENT_CUSTOMER_COMPANY_ID()',
  'GRANT SELECT, INSERT, UPDATE ON TABLE PUBLIC.CLIENT_UI_SETTINGS TO AUTHENTICATED',
  'GRANT ALL ON TABLE PUBLIC.CLIENT_UI_SETTINGS TO SERVICE_ROLE',
  'ALTER PUBLICATION SUPABASE_REALTIME ADD TABLE PUBLIC.CLIENT_UI_SETTINGS',
  'SUPABASE_REALTIME',
  'CLIENT_UI_SETTINGS',

]) {
  if (!clientUiSettingsParityUpper.includes(token)) throw new Error(`Missing client_ui_settings restore-parity invariant: ${token}`);
}
for (const token of [
  'CREATE TABLE IF NOT EXISTS PUBLIC.PROFILES',
  'ORGANIZATION_ID UUID NOT NULL',
  'CUSTOMER_ID UUID',
  'ROLE TEXT NOT NULL',
  'PROFILES_ID_FKEY',
  'PROFILES_ORGANIZATION_ID_FKEY',
  'PROFILES_CUSTOMER_ID_FKEY',
  'PROFILES_CUSTOMER_IDX',
  'PROFILES_ORG_IDX',
  'PROFILES_SELF_SELECT',
  'CREATE TABLE IF NOT EXISTS PUBLIC.CARTS',
  'COMPANY_ID UUID NOT NULL',
  'CUSTOMER_ID UUID NOT NULL',
  'USER_ID UUID NOT NULL',
  'CARTS_COMPANY_ID_FKEY',
  'CARTS_CUSTOMER_ID_FKEY',
  'CARTS_USER_ID_FKEY',
  'CARTS_COMPANY_ID_USER_ID_KEY',
  'IDX_CARTS_CUSTOMER_ID_FK',
  'IDX_CARTS_USER_ID_FK',
  'CARTS_SELF_SELECT',
  'CREATE OR REPLACE FUNCTION PUBLIC.CURRENT_CUSTOMER_ID()',
  'CREATE OR REPLACE FUNCTION PUBLIC.CURRENT_CUSTOMER_COMPANY_ID()',
  'GRANT EXECUTE ON FUNCTION PUBLIC.CURRENT_CUSTOMER_ID() TO AUTHENTICATED, SERVICE_ROLE',
  'GRANT EXECUTE ON FUNCTION PUBLIC.CURRENT_CUSTOMER_COMPANY_ID() TO AUTHENTICATED, SERVICE_ROLE',
  'REVOKE ALL ON FUNCTION PUBLIC.CURRENT_CUSTOMER_ID() FROM PUBLIC',
  'REVOKE ALL ON FUNCTION PUBLIC.CURRENT_CUSTOMER_COMPANY_ID() FROM PUBLIC',
  'LANGUAGE SQL',
  'SECURITY DEFINER',
  'SET SEARCH_PATH = PUBLIC',
  'ENABLE ROW LEVEL SECURITY',
  'GRANT SELECT ON TABLE PUBLIC.CARTS TO AUTHENTICATED',
  'CREATE TABLE IF NOT EXISTS PUBLIC.CART_ITEMS',
  'CART_ID UUID NOT NULL',
  'PRODUCT_ID UUID NOT NULL',
  'QUANTITY INTEGER NOT NULL',
  'CART_ITEMS_CART_ID_FKEY',
  'CART_ITEMS_PRODUCT_ID_FKEY',
  'CART_ITEMS_CART_ID_PRODUCT_ID_KEY',
  'CART_ITEMS_QUANTITY_CHECK',
  'IDX_CART_ITEMS_PRODUCT_ID_FK',
  'CART_ITEMS_SELF_SELECT',
  'USER_ID = (SELECT AUTH.UID())',
  'CUSTOMER_ID = CURRENT_CUSTOMER_ID()',
  'COMPANY_ID = CURRENT_CUSTOMER_COMPANY_ID()',
  'GRANT SELECT ON TABLE PUBLIC.CART_ITEMS TO AUTHENTICATED',
]) {
  if (!cartsParityUpper.includes(token)) throw new Error(`Missing carts schema restore-parity invariant: ${token}`);
}

for (const token of [
  'CREATE OR REPLACE FUNCTION public.import_create_job',
  'CREATE OR REPLACE FUNCTION public.import_update_job_progress',
  'p_invalid_rows integer DEFAULT 0',
  'p_duplicate_rows integer DEFAULT 0',
  "p_status text DEFAULT 'processing'",
  'SECURITY INVOKER',
  'SET search_path = public',
  'current_company_id()',
  'TENANT_CONTEXT_MISMATCH',
  'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN',
  'REVOKE ALL ON FUNCTION',
  'GRANT EXECUTE ON FUNCTION',
]) if (!executable.includes(token)) throw new Error(`Missing recovery security/lifecycle invariant: ${token}`);

for (const token of [
  'backup_restore_passed',
  'migration_parity_passed',
  'artifact_integrity_passed',
  'rollback_passed',
  'security_audit_passed',
  'PRODUCTION_CERTIFICATION_EVIDENCE_KEYS',
]) {
  if (!evidence.includes(token) && !contract.includes(token)) {
    throw new Error(`Missing certification evidence invariant: ${token}`);
  }
}

// Bind the remaining-work register to recovery concepts explicitly present in
// the authoritative index. Runtime recovery proof remains a separate gate.
const indexLower = index.toLowerCase();
for (const token of ['backup/restore', 'rollback', 'recovery', 'runtime proof remains open']) {
  if (!indexLower.includes(token)) throw new Error(`Remaining-work register lost recovery boundary: ${token}`);
}

const decoy = `-- CREATE OR REPLACE FUNCTION public.import_create_job\n-- current_company_id()\n-- TENANT_CONTEXT_MISMATCH`;
const sanitizedDecoy = stripSqlComments(decoy);
for (const token of ['CREATE OR REPLACE FUNCTION public.import_create_job', 'current_company_id()', 'TENANT_CONTEXT_MISMATCH']) {
  if (sanitizedDecoy.includes(token)) throw new Error(`Test-of-test failed: SQL comment decoy satisfied ${token}`);
}

console.log('Phase 10 backup/restore contract: PASS (source-level only; restore drill/RPO/RTO remain runtime evidence)');
