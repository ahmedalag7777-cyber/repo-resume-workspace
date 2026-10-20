import assert from 'node:assert/strict';
import { advanceRuntime, buildLineage, consolidateRuntime, chooseScenario, prioritizeDecisions, evidenceQuality, canAutonomouslyExecute } from '../src/lib/phase-kl-runtime.ts';
import type { RuntimeState } from '../src/lib/phase-kl-runtime.ts';

const initial: RuntimeState<{ value: number }> = {
  sourceHash: 'sha-1',
  checkpoint: { stage: 'queued', sourceHash: 'sha-1', evidenceKeys: [], updatedAt: Date.now() },
  rows: [{ key: 'sku-1', hash: 'r1', value: { value: 10 } }],
  evidence: [],
};
const evidence = (key: string, quality: number) => ({ key, source: 'test-fixture', observedAt: '2026-08-25T12:00:00.000Z', quality });
const extracted = advanceRuntime(initial, 'fingerprinted', [evidence('source:fingerprint', 1)]);
const canonical = advanceRuntime(extracted, 'extracted', [evidence('extract:canonical', 0.98)]);
assert.equal(canonical.checkpoint.sourceHash, 'sha-1');
assert.throws(() => advanceRuntime(canonical, 'analyzed', [{ ...evidence('bad:missing-source', 1), source: '' }]));
assert.throws(() => advanceRuntime(canonical, 'analyzed', [{ ...evidence('bad:timestamp', 1), observedAt: 'not-a-date' }]));
assert.equal(buildLineage(initial.rows, { key: 'sku-1', hash: 'r2', value: { value: 12 } })?.state, 'changed');
assert.equal(consolidateRuntime([
  { businessKey: 'sku-1', sourceId: 'secondary', precedence: 2, observedAt: '2026-01-02', value: 9 },
  { businessKey: 'sku-1', sourceId: 'primary', precedence: 1, observedAt: '2026-01-01', value: 10 },
])[0].value, 10);
assert.equal(chooseScenario([
  { key: 'unsafe', expectedImpact: 100, risk: 10, liquidityRequired: 2, serviceLevel: 1 },
  { key: 'safe', expectedImpact: 70, risk: 2, liquidityRequired: 3, serviceLevel: 0.95 },
], { maxRisk: 3, protectedLiquidity: 3, minimumServiceLevel: 0.9 })?.key, 'safe');
assert.equal(prioritizeDecisions([{ key: 'critical', materiality: 1, confidence: 0.95, urgency: 1, risk: 0.1 }], 1)[0].escalationRequired, true);
assert.equal(evidenceQuality([evidence('a', 1), evidence('b', 0.8)]), 0.9);
assert.equal(canAutonomouslyExecute({ trustHealthy: true, evidenceQuality: 0.95, confidence: 0.95, riskBudgetValid: true, criticalDrift: false, rollbackVerified: true, isolationVerified: true }).eligible, true);
console.log('Phase K/L integrated runtime: PASS');
