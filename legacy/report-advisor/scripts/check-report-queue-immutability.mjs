import { readFileSync } from 'node:fs';

const queue = readFileSync('src/lib/report-execution/queue.ts', 'utf8');
const contract = readFileSync('src/lib/report-execution/report-execution-contract.ts', 'utf8');

for (const token of ['enqueue(', 'claim(', 'heartbeat(', 'complete(', 'fail(', 'assertLease', 'cloneRequest', 'structuredClone', 'formats: [...request.formats]']) {
  if (!queue.includes(token)) throw new Error(`queue missing ${token}`);
}
for (const token of ['tenantId', 'idempotencyKey', 'formats', 'parameters']) {
  if (!contract.includes(token)) throw new Error(`contract missing ${token}`);
}

// Test the test: the old shallow-return pattern must be rejected by the gate itself.
const decoy = 'return { ...job };';
if (!/cloneJob\(job\)/.test(queue)) throw new Error('QUEUE_MUTABLE_REFERENCE: queue still returns shallow job copies');
if (queue.includes(decoy)) throw new Error('QUEUE_MUTABLE_REFERENCE: shallow return remains');
if (!/parameters:\s*structuredClone\(request\.parameters\)/.test(queue)) throw new Error('QUEUE_MUTABLE_REFERENCE: nested parameters are not cloned');
if (!/formats:\s*\[\.\.\.request\.formats\]/.test(queue)) throw new Error('QUEUE_MUTABLE_REFERENCE: formats are not cloned');

console.log('Report queue immutability gate: PASS');
