import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const workflows = fs.readdirSync(path.join(root, '.github/workflows'));

const capabilities = [
  { name: 'document-intelligence', files: ['services/document-intelligence/app', 'services/document-intelligence/tests'], scripts: ['test:document-intelligence-contract', 'test:document-intelligence-closure'], workflow: 'document-intelligence-closure.yml' },
  { name: 'watched-reports', files: ['scripts/check-watched-report-pipeline-contract.mjs'], scripts: ['test:watched-report-pipeline'], workflow: 'j-k-l-runtime-wave.yml' },
  { name: 'business-control-plane', files: ['scripts/check-business-control-plane-contract.mjs'], scripts: ['test:business-control-plane'], workflow: 'quality.yml' },
  { name: 'phase-k-runtime', files: ['scripts/production-intelligence-runtime.test.mjs'], scripts: ['test:phase-k-runtime'], workflow: 'quality.yml' },
  { name: 'phase-l-runtime', files: ['scripts/check-phase-l-runtime-contract.mjs'], scripts: ['test:phase-l-runtime', 'test:phase-l-resumable-execution'], workflow: 'quality.yml' },
  { name: 'production-certification', files: ['scripts/check-phase-m-certification-contract.mjs', 'scripts/check-production-certification-contract.mjs'], scripts: ['test:phase-m-certification', 'test:production-certification-contract'], workflow: 'production-certification-boundary.yml' },
  { name: 'tenant-security', files: ['scripts/check-tenant-security-contract.mjs', 'scripts/check-global-tenant-rls.mjs'], scripts: ['test:tenant-security-contract', 'test:global-tenant-rls'], workflow: 'quality.yml' },
  { name: 'release-resilience', files: ['scripts/check-release-resilience-manifest.mjs', 'scripts/check-release-evidence-contract.mjs'], scripts: ['test:release-resilience-manifest', 'test:operational-resilience'], workflow: 'recovery-readiness.yml' },
];

const failures = [];
for (const cap of capabilities) {
  for (const file of cap.files) {
    if (!fs.existsSync(path.join(root, file))) failures.push(`${cap.name}: missing file ${file}`);
  }
  for (const script of cap.scripts) {
    if (!pkg.scripts?.[script]) failures.push(`${cap.name}: missing package script ${script}`);
  }
  if (!workflows.includes(cap.workflow)) failures.push(`${cap.name}: missing workflow ${cap.workflow}`);
}

if (failures.length) {
  console.error('CROSS-SURFACE TRACEABILITY: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`CROSS-SURFACE TRACEABILITY: PASS (${capabilities.length} critical capability chains)`);
