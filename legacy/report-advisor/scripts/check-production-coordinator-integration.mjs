import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const bridge = fs.readFileSync(path.join(root, 'src/lib/report-execution/production-coordinator-bridge.ts'), 'utf8');
for (const token of ['previousRows','currentRows','sourceCandidates','scenarioOptions','riskBudget','portfolioCandidates','autonomy','evidence']) {
  if (!bridge.includes(token)) throw new Error(`Production coordinator contract missing: ${token}`);
}
for (const forbidden of ['baseValue: Math.max(0, input.rows.length)', 'continuousTrustHealthy: true', 'rollbackAvailable: true', 'criticalDrift: false']) {
  if (bridge.includes(forbidden)) throw new Error(`Production coordinator contains fabricated runtime evidence: ${forbidden}`);
}
if (bridge.includes('new PhaseKLRuntime')) throw new Error('Production coordinator is using stale PhaseKLRuntime API');
console.log('Production coordinator integration contract: PASS');
