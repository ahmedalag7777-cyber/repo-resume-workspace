import fs from 'node:fs';

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*(?:--|\/\/).*$/gm, '');

const runtime = fs.readFileSync('scripts/report-execution-runtime.test.ts', 'utf8');
const adapter = fs.readFileSync('src/lib/report-execution/durable-worker-adapter.ts', 'utf8');
const failureSql = fs.readFileSync(
  'supabase/migrations/20260825153000_runtime_lease_hardening.sql',
  'utf8',
);

const executableFailureSql = stripComments(failureSql);
for (const token of [
  'attempt >= max_attempts',
  "'dead_letter'",
  "status IN ('leased','processing')",
  'lease_expires_at > now()',
  'company_id=public.current_company_id()',
]) {
  if (!executableFailureSql.includes(token)) {
    throw new Error(`WORKER_FAILURE_STATE_MACHINE_FAIL:${token}`);
  }
}

for (const token of [
  'requestIdentity',
  'sourceSnapshotId',
  'idempotencyKey',
  'saveCheckpoint',
  'complete(',
  'fail(',
  'retry(',
]) {
  if (!adapter.includes(token)) throw new Error(`WORKER_RECOVERY_BOUNDARY_FAIL:${token}`);
}

for (const token of [
  'advanceCheckpoint',
  'canAdvanceCheckpoint',
  'idempotencyKey',
  'sourceSnapshotId',
]) {
  if (!runtime.includes(token)) throw new Error(`WORKER_RUNTIME_REGRESSION_MISSING:${token}`);
}

console.log('Worker failure/recovery state machine: PASS');
