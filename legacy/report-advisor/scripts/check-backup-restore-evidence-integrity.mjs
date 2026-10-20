import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const endpoint = 'api/backup-restore-verify.mjs';
const runtime = 'src/server/resilience-runtime.mjs';
const source = readFileSync(endpoint, 'utf8');
const runtimeSource = readFileSync(runtime, 'utf8');

execFileSync(process.execPath, ['--check', endpoint], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', runtime], { stdio: 'inherit' });

const requiredContracts = [
  "'RESILIENCE_TARGET_ENV',",
  "isProductionEnv() || !isSafeRestoreTargetEnv()",
  "const maxRpoSeconds = Number(process.env.RESILIENCE_MAX_RPO_SECONDS);",
  "if (!Number.isFinite(maxRpoSeconds) || maxRpoSeconds < 0)",
  "if (!/^[a-f0-9]{64}$/.test(expectedArtifactSha256))",
  "Boolean(String(backup?.id || '').trim())",
  "Number.isFinite(insertedAt)",
  "const rtoSeconds = measuredRto;",
  "reported_rto_seconds",
  "restoreEvidence.restored !== true || restoreEvidence.integrity_verified !== true",
];

for (const contract of requiredContracts) {
  assert.ok(source.includes(contract), `missing backup evidence integrity contract: ${contract}`);
}

assert.ok(runtimeSource.includes('export function isSafeRestoreTargetEnv()'), 'safe restore target helper missing');
assert.ok(
  runtimeSource.includes('/^(staging|preview|test|testing|qa|development|dev|recovery|dr)([-_].*)?$/i'),
  'restore target allowlist must be explicitly non-production',
);

assert.ok(
  !source.includes("Number.isFinite(Number(restoreEvidence.rto_seconds)) ? Number(restoreEvidence.rto_seconds) : measuredRto"),
  'RTO evidence must not trust verifier-reported timing as the measured RTO',
);

console.log(`PASS: backup/restore evidence integrity contract (${requiredContracts.length + 3} invariants).`);