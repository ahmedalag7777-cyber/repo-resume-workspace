import assert from 'node:assert/strict';
import { runProductionLifecycle } from '../src/lib/report-execution/production-coordinator-bridge.ts';

const result = runProductionLifecycle({
  jobId: 'job-1',
  companyId: 'tenant-1',
  sourceHash: 'sha-current',
  previousRows: [
    { key: 'sku-1', hash: 'old', value: { qty: 1 } },
    { key: 'sku-2', hash: 'same', value: { qty: 5 } },
  ],
  currentRows: [
    { key: 'sku-1', hash: 'new', value: { qty: 2 } },
    { key: 'sku-2', hash: 'same', value: { qty: 5 } },
    { key: 'sku-3', hash: 'added', value: { qty: 4 } },
  ],
  sourceCandidates: [{ businessKey: 'sku-1', sourceId: 'primary', precedence: 1, observedAt: '2026-08-25', value: 2 }],
  scenarioOptions: [
    { key: 'unsafe', expectedImpact: 100, risk: 5, liquidityRequired: 1, serviceLevel: 1 },
    { key: 'safe', expectedImpact: 70, risk: 1, liquidityRequired: 1, serviceLevel: 0.95 },
  ],
  riskBudget: { maxRisk: 1, protectedLiquidity: 1, minimumServiceLevel: 0.9 },
  portfolioCandidates: [{ key: 'sku-1', materiality: 0.7, confidence: 0.95, urgency: 0.8, risk: 0.2 }],
  autonomy: {
    trustHealthy: false,
    evidenceQuality: 1,
    confidence: 1,
    riskBudgetValid: true,
    criticalDrift: false,
    rollbackVerified: true,
    isolationVerified: true,
  },
  evidence: [{ key: 'source:sha-current', source: 'test-fixture', observedAt: '2026-08-25T12:00:00.000Z', quality: 1 }],
});

assert.deepEqual(result.lineage.map((row) => [row.key, row.state]), [
  ['sku-1', 'changed'],
  ['sku-2', 'unchanged'],
  ['sku-3', 'new'],
]);
assert.equal(result.consolidation[0]?.value, 2);
assert.equal(result.scenario?.key, 'safe');
assert.equal(result.autonomy.eligible, false);
assert.deepEqual(result.autonomy.failures, ['continuous_trust']);
assert.throws(() => runProductionLifecycle({ ...({} as never) }));
assert.throws(() => runProductionLifecycle({
  ...({} as never),
  jobId: 'job-2',
  companyId: 'tenant-1',
  sourceHash: 'sha',
  currentRows: [{ key: 'sku', hash: 'h' }],
  previousRows: [],
  sourceCandidates: [],
  scenarioOptions: [],
  riskBudget: { maxRisk: 1, protectedLiquidity: 1, minimumServiceLevel: 1 },
  portfolioCandidates: [],
  autonomy: { trustHealthy: true, evidenceQuality: 1, confidence: 1, riskBudgetValid: true, criticalDrift: false, rollbackVerified: true, isolationVerified: true },
  evidence: [{ key: 'missing-provenance', source: '', observedAt: '2026-08-25T12:00:00.000Z', quality: 1 }],
}));
console.log('Production coordinator integration: PASS');
