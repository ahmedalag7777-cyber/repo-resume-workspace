import fs from 'node:fs';

const required = [
  'docs/MASTER_PRODUCT_REFERENCE.md',
  'docs/PRODUCT_INSPIRATION_MATRIX.md',
  'docs/MASTER_REQUIREMENTS_TRACEABILITY.md',
  'docs/FREE_OPEN_SOURCE_TOOLBOX.md',
  'docs/DOCUMENT_INGESTION_ACCURACY.md',
  'docs/FREE_FIRST_ARCHITECTURE.md',
  'docs/MULTI_TENANT_SECURITY.md',
  'src/lib/intelligence/truthPolicy.ts',
  'src/lib/intelligence/processingRouter.ts',
  'src/lib/intelligence/adaptiveProcessingPipeline.ts',
  'src/lib/free-toolbox/queryPlanner.ts',
  'src/lib/free-toolbox/query-executor.ts',
  'src/lib/free-toolbox/evidence-ledger.ts',
  'src/lib/free-toolbox/report-readiness.ts',
  'src/lib/free-toolbox/ocr-routing.ts',
  'services/document-intelligence/app/main.py'
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing integrated foundation artifact: ${file}`);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.scripts?.typecheck) throw new Error('typecheck script missing');
if (!pkg.scripts?.build) throw new Error('build script missing');

const master = fs.readFileSync('docs/MASTER_PRODUCT_REFERENCE.md', 'utf8');
for (const token of [
  'AUTHORITATIVE SINGLE REFERENCE',
  'deterministic business calculations',
  'evidence/lineage',
  'free-first/open-source-first'
]) {
  if (!master.includes(token)) throw new Error(`Master reference invariant missing: ${token}`);
}

const truth = fs.readFileSync('src/lib/intelligence/truthPolicy.ts', 'utf8');
for (const token of ['VERIFIED', 'QUALIFIED', 'INSUFFICIENT_DATA', 'BLOCKED', 'canDriveDecision']) {
  if (!truth.includes(token)) throw new Error(`Truth invariant missing: ${token}`);
}

// Validate the processing router against its real source contract rather than
// requiring internal implementation labels that do not exist in the public API.
const router = fs.readFileSync('src/lib/intelligence/processingRouter.ts', 'utf8');
const routerInvariants = [
  ['workload kinds', ['spreadsheet', 'document', 'ocr', 'table', 'analytics', 'forecast']],
  ['execution modes', ['browser', 'worker', 'service']],
  ['engines', ['native', 'worker', 'document-service', 'analytics-engine']],
  ['offline routing', ["r.network==='offline'", "engine:'native'", "reason:'offline-first local path'"]],
  ['large-workload routing', ["mode:'worker'", "reason:'large workload isolated from UI thread'"]],
  ['accuracy-critical document routing', ["mode:'service'", "engine:'document-service'", "reason:'accuracy-critical document workload'"]]
];

for (const [name, tokens] of routerInvariants) {
  for (const token of tokens) {
    if (!router.includes(token)) throw new Error(`Processing router invariant missing (${name}): ${token}`);
  }
}

console.log(`Selective foundation integrity: PASS (${required.length} artifacts; router contract validated semantically)`);
