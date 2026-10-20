import { readFileSync } from 'node:fs';

const files = {
  contract: 'src/lib/report-execution/report-execution-contract.ts',
  idempotency: 'src/lib/report-execution/idempotency.ts',
  gate: 'src/lib/report-execution/execution-gate.ts',
  queue: 'src/lib/report-execution/queue.ts',
  durable: 'src/lib/report-execution/durable-worker-adapter.ts',
  ledger: 'src/lib/report-execution/execution-ledger.ts',
};
const source = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, readFileSync(p, 'utf8')]));

const required = {
  contract: ['tenantId', 'sourceSnapshotId', 'idempotencyKey', 'ReportExecutionEvidence'],
  idempotency: ['IdempotencyRegistry', 'fingerprintRequest', 'different request'],
  gate: ['assertExecutionRequest', 'assertGovernedRoute', 'sourceSnapshotId'],
  queue: ['claim', 'lease', 'maxAttempts', 'heartbeat', 'listDeadLetters'],
  durable: ['claim_report_execution_job', 'heartbeat_report_execution_job', 'complete_report_execution_job', 'fail_report_execution_job'],
  ledger: ['artifactRefs', 'evidence', 'tenantId', 'immutable'],
};
for (const [name, tokens] of Object.entries(required)) {
  for (const token of tokens) if (!source[name].includes(token)) throw new Error(`${name}: missing ${token}`);
}

// A gate must not be satisfiable merely because a required marker appears in a comment.
for (const [name, text] of Object.entries(source)) {
  const withoutComments = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
  if (name === 'contract' && !withoutComments.includes('tenantId')) throw new Error('comment-only tenantId detected');
  if (name === 'gate' && !withoutComments.includes('assertExecutionRequest')) throw new Error('comment-only execution gate detected');
}

// Truth boundary: no completion evidence may be represented by a bare boolean.
if (/completion\s*:\s*(true|false)\b/.test(source.contract)) throw new Error('completion boolean violates evidence lifecycle');
if (/verified\s*:\s*(true|false)\b/.test(source.ledger)) throw new Error('verified boolean risks truth collapse');

console.log('Report execution adversarial contract: PASS');
