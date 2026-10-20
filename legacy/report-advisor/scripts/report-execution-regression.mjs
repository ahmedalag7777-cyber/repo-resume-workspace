import { readFileSync } from 'node:fs';

const queue = readFileSync(new URL('../src/lib/report-execution/queue.ts', import.meta.url), 'utf8');
const contract = readFileSync(new URL('../src/lib/report-execution/report-execution-contract.ts', import.meta.url), 'utf8');
const idempotency = readFileSync(new URL('../src/lib/report-execution/idempotency.ts', import.meta.url), 'utf8');

const required = [
  [queue, 'leaseOwner'],
  [queue, 'leaseExpiresAt'],
  [queue, "job.status = job.attempts < job.maxAttempts ? 'queued' : 'failed'"],
  [queue, "if (job.status !== 'running' || job.leaseOwner !== workerId)"],
  [contract, 'tenantId'],
  [contract, 'sourceSnapshotId'],
  [contract, 'idempotencyKey'],
  [idempotency, 'tenantId:${key}'],
];
for (const [source, token] of required) if (!source.includes(token)) throw new Error(`Report execution regression invariant missing: ${token}`);

if (!contract.includes("new Set(request.formats).size !== request.formats.length")) throw new Error('Duplicate output format guard missing');
if (!contract.includes("evidence.tenantId !== tenantId")) throw new Error('Evidence tenant isolation guard missing');

console.log('Report execution regression gate: PASS');
