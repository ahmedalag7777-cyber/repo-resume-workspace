import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  ['docs/MASTER_EXECUTION_INDEX.md', 'master execution index'],
  ['.github/workflows/quality.yml', 'primary quality workflow'],
  ['.github/workflows/phase-e-live-certification.yml', 'tenant/security live certification workflow'],
  ['.github/workflows/phase-f-live-resilience.yml', 'resilience live certification workflow'],
  ['.github/workflows/production-release-gate-chain.yml', 'production release gate chain'],
  ['.github/workflows/security-provenance-certification.yml', 'security provenance certification'],
  ['scripts/check-tenant-security-contract.mjs', 'tenant security contract'],
  ['scripts/check-global-tenant-rls.mjs', 'global tenant RLS contract'],
  ['scripts/check-production-gate-runtime.mjs', 'production gate runtime contract'],
  ['scripts/check-production-readiness.mjs', 'production readiness contract'],
  ['scripts/check-production-release-blockers.mjs', 'production release blockers'],
  ['scripts/check-release-resilience-manifest.mjs', 'release resilience manifest'],
  ['scripts/check-phase-f-runtime-closure.mjs', 'phase F runtime closure'],
  ['scripts/check-phase-g-release-closure.mjs', 'phase G release closure'],
  ['scripts/check-document-intelligence-closure.mjs', 'document intelligence closure'],
  ['scripts/check-business-control-plane-contract.mjs', 'business control plane contract'],
];

const missing = [];
for (const [relative, label] of required) {
  if (!fs.existsSync(path.join(root, relative))) missing.push(`${label}: ${relative}`);
}

if (missing.length) {
  console.error('MASTER_P0_INVENTORY=FAIL');
  for (const item of missing) console.error(`MISSING ${item}`);
  process.exit(1);
}

console.log(`MASTER_P0_INVENTORY=PASS (${required.length}/${required.length} required artifacts present)`);
console.log('NOTE: artifact presence is not production certification; live evidence remains a separate gate.');
