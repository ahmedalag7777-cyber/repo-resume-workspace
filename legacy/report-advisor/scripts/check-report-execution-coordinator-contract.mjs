import fs from 'node:fs';
const files = {
  'src/lib/report-execution/execution-ledger.ts': ['ReportExecutionCoordinator','assertReportExecutionReady','assertNoQuarantine','IdempotencyRegistry','InMemoryReportQueue','immutable: true'],
};
for (const [file,tokens] of Object.entries(files)) { const s=fs.readFileSync(file,'utf8'); for (const token of tokens) if(!s.includes(token)) throw new Error(`${file}: missing ${token}`); }
const srcRoot = new URL('../src/', import.meta.url);
const allowedInMemoryFiles = new Set([
  'lib/report-execution/execution-ledger.ts',
  'lib/report-execution/queue.ts',
  'lib/report-execution/worker-adapter.ts',
]);
const forbiddenProductionTokens = [
  'new InMemoryReportQueue(',
  'import { InMemoryReportQueue',
  'import { ReportExecutionCoordinator',
];
const forbiddenInMemoryModuleImports = [
  './report-execution/execution-ledger',
  './report-execution/worker-adapter',
  './lib/report-execution/execution-ledger',
  './lib/report-execution/worker-adapter',
  '@/lib/report-execution/execution-ledger',
  '@/lib/report-execution/worker-adapter',
  '../report-execution/execution-ledger',
  '../report-execution/worker-adapter',
];
function scanSourceTree(dir, relative = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      scanSourceTree(new URL(`../src/${nextRelative}/`, import.meta.url).pathname, nextRelative);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    if (/\.test\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    const source = fs.readFileSync(new URL(`../src/${nextRelative}`, import.meta.url), 'utf8');

    const isInMemoryDefinition = allowedInMemoryFiles.has(nextRelative);
    if (!isInMemoryDefinition) {
      for (const token of forbiddenProductionTokens) {
        if (source.includes(token)) throw new Error(`Production source references in-memory report execution surface: ${nextRelative}: ${token}`);
      }
      for (const moduleRef of forbiddenInMemoryModuleImports) {
        if (source.includes(`from '${moduleRef}'`) || source.includes(`from "${moduleRef}"`)) {
          throw new Error('Production source imports in-memory report execution compatibility surface: ' + nextRelative + ' -> ' + moduleRef);
        }
      }
    }
  }
}
scanSourceTree(new URL('../src/', import.meta.url).pathname);
console.log('in-memory report execution surfaces are compatibility-only leaves with no production importers');

const migration = 'supabase/migrations/20260830021624_harden_report_execution_claim_boundary.sql';
if (!fs.existsSync(migration)) throw new Error(`Missing report execution claim boundary migration: ${migration}`);
const migrationSql = fs.readFileSync(migration,'utf8');
for (const token of ["claim_report_execution_job(uuid,text,integer)", 'revoke execute', 'from authenticated', 'from anon', 'from public']) {
  if (!migrationSql.includes(token)) throw new Error(`${migration}: missing ${token}`);
}
console.log('report execution coordinator contract: PASS');
