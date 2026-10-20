import fs from 'node:fs';

const root = process.cwd();
const file = 'src/lib/report-execution/durable-production-runner.ts';
if (!fs.existsSync(file)) throw new Error('Durable production runner missing');
const source = fs.readFileSync(file, 'utf8');
for (const token of [
  'store.claim', 'store.saveCheckpoint', 'store.complete', 'store.fail', 'store.retry',
  'runProductionLifecycle', 'sourceHash', 'Tenant mismatch', 'executeStage',
  'heartbeatTimer', 'AggregateError', 'failure/recovery state could not be persisted',
]) {
  if (!source.includes(token)) throw new Error(`Durable runner contract missing: ${token}`);
}
console.log('Durable production runner contract: PASS');
