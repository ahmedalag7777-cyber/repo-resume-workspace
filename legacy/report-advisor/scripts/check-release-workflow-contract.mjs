import fs from 'node:fs';
const workflow = fs.readFileSync('.github/workflows/release-certification.yml','utf8');
const required = [
  'workflow_dispatch','staging','production','npm ci --no-audit --no-fund','npm run typecheck','npm run lint','npm run build',
  'npm run test:production-release-blockers','npm run test:production-readiness','npm run test:operational-resilience',
  'npm run test:release-resilience-manifest','check-release-evidence-contract.mjs','source_sha','migrations_fingerprint',
  'dependency_lock_fingerprint','artifact_fingerprint','actions/upload-artifact@v4'
];
const missing = required.filter(x => !workflow.includes(x));
if (missing.length) throw new Error(`Release workflow contract blockers:\n${missing.join('\n')}`);
console.log('Release workflow contract: PASS');
