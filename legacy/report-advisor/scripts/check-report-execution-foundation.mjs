import { readFileSync } from 'node:fs';
const files = {
  'src/lib/report-execution/report-execution-contract.ts': ['ReportExecutionRequest','ReportExecutionEvidence','assertExecutionRequest'],
  'src/lib/report-execution/idempotency.ts': ['IdempotencyRegistry','fingerprintRequest','tenantId'],
  'src/lib/report-execution/execution-gate.ts': ['assertReportExecutionReady','assertNoQuarantine','assertGovernedRoute'],
};
for (const [path, tokens] of Object.entries(files)) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  for (const token of tokens) if (!source.includes(token)) throw new Error(`Report execution foundation missing ${token} in ${path}`);
}
console.log('Report execution foundation contract: PASS');
