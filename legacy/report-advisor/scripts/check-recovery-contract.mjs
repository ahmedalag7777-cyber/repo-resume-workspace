import { execFileSync } from 'node:child_process';

const canonicalChecks = [
  'scripts/check-phase-f-runtime-closure.mjs',
  'scripts/check-operational-resilience-contract.mjs',
  'scripts/check-release-resilience-manifest.mjs',
  'scripts/check-continuous-trust-contract.mjs',
];

for (const check of canonicalChecks) {
  execFileSync(process.execPath, [check], { stdio: 'inherit' });
}

console.log(`RECOVERY CONTRACT: PASS (canonical Phase-F checks: ${canonicalChecks.length})`);
