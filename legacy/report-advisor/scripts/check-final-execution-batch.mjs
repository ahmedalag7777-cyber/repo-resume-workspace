import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const gates = [
  'check-j-runtime-chain.mjs','check-recovery-contract.mjs','check-n-to-s-real-gates.mjs','check-next-wave-closure.mjs','check-recovery-readiness.mjs',
  'check-document-resilience.mjs','check-master-p0-inventory.mjs','check-release-audit-bundle.mjs','check-production-readiness.mjs','check-n-to-s-release-matrix.mjs',
  'check-phase-f-runtime-closure.mjs','check-phase-g-release-closure.mjs','check-final-safety-invariants.mjs','check-n-to-s-evidence-contract.mjs','check-production-recovery-gate.mjs',
  'check-release-evidence-snapshot.mjs','check-release-gate-completeness.mjs','check-cross-surface-traceability.mjs','check-rollback-decision-contract.mjs','check-k-to-s-runtime-integration.mjs',
  'check-live-gate-manifest-integrity.mjs','check-master-requirements-contract.mjs','check-release-evidence-completeness.mjs','check-performance-budget.mjs',
  'check-import-direct-write-guard.mjs','check-semantic-metric-registry.mjs','check-workflow-batch-integrity.mjs','check-workflow-command-integrity.mjs','check-auth-tenant-convergence.mjs',
];

const missing = gates.filter((g) => !existsSync(join(root, g)));
if (missing.length) {
  console.error(`MISSING_GATES=${missing.join(',')}`);
  process.exit(1);
}

let failed = 0;
for (const gate of gates) {
  const r = spawnSync(process.execPath, [join(root, gate)], { encoding: 'utf8' });
  if (r.status !== 0) {
    failed += 1;
    console.error(`FAIL ${gate}`);
    if (r.stdout) console.error(r.stdout.trim());
    if (r.stderr) console.error(r.stderr.trim());
  } else {
    console.log(`PASS ${gate}`);
  }
}

if (failed) process.exit(1);
console.log(`FINAL_EXECUTION_BATCH_PASS=${gates.length}`);
