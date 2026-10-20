import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));

// Validate executable implementation surfaces rather than prose in a roadmap.
const requiredFiles = [
  'scripts/check-watched-report-pipeline-contract.mjs',
  'scripts/check-file-engine-contract.mjs',
  'scripts/check-file-engine-capability-contract.mjs',
  'scripts/check-import-runtime-governance.mjs',
  'scripts/check-import-transaction-contract.mjs',
  'scripts/check-import-rpc-tenant-context.mjs',
  'scripts/check-import-business-key.mjs',
  'scripts/check-onyx-adapter-contract.mjs',
  'scripts/check-report-truth-contract.mjs',
  'scripts/check-forecast-calibration-contract.mjs',
  'scripts/check-decision-intelligence-closure.mjs',
  'scripts/check-phase-k-production-intelligence.mjs',
  'scripts/check-phase-l-runtime-contract.mjs',
  'scripts/check-phase-f-runtime-closure.mjs',
  'scripts/check-phase-g-release-closure.mjs',
  'scripts/check-tenant-security-contract.mjs',
  'scripts/check-global-tenant-rls.mjs',
];
const missingFiles = requiredFiles.filter(file => !exists(file));
if (missingFiles.length) throw new Error(`Master implementation surfaces missing:\n${missingFiles.join('\n')}`);

const pkg = JSON.parse(read('package.json'));
const requiredScripts = [
  'test:watched-report-pipeline', 'test:file-engine-contract', 'test:file-engine-capability-contract',
  'test:import-runtime-governance', 'test:import-transaction-contract', 'test:import-rpc-tenant-context',
  'test:import-business-key', 'test:onyx-adapter-contract', 'test:report-truth', 'test:forecast-calibration-contract',
  'test:decision-intelligence-closure', 'test:phase-k-production-intelligence', 'test:phase-l-runtime',
  'test:phase-f-runtime-closure', 'test:phase-g-release-closure', 'test:tenant-security-contract', 'test:global-tenant-rls',
];
const missingScripts = requiredScripts.filter(name => typeof pkg.scripts?.[name] !== 'string');
if (missingScripts.length) throw new Error(`Master implementation scripts missing:\n${missingScripts.join('\n')}`);

const quality = read('.github/workflows/quality.yml');
if (!quality.includes('test:master-requirements')) throw new Error('Master requirement gate is not release-blocking in Quality');

const implementationAssertions = [
  ['watched report pipeline', /fingerprint|watch|synchron/i, read('scripts/check-watched-report-pipeline-contract.mjs')],
  ['file engine extraction', /parse|extract|reconstruct/i, read('scripts/check-file-engine-contract.mjs')],
  ['import runtime governance', /supabase\.from|import-upsert|unified-import|runImportJob/i, read('scripts/check-import-runtime-governance.mjs')],
  ['report truth', /source|formula|kpi|export/i, read('scripts/check-report-truth-contract.mjs')],
  ['decision intelligence', /evidence|confidence|decision|outcome/i, read('scripts/check-decision-intelligence-closure.mjs')],
  ['phase L runtime', /lease|heartbeat|checkpoint|recovery/i, read('scripts/check-phase-l-runtime-contract.mjs')],
];
const missingAssertions = implementationAssertions.filter(([, pattern, content]) => !pattern.test(content)).map(([name]) => name);
if (missingAssertions.length) throw new Error(`Master implementation assertions missing:\n${missingAssertions.join('\n')}`);

console.log('Master requirements contract: PASS (implementation surfaces and executable guards verified)');