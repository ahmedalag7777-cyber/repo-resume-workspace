import assert from 'node:assert/strict';
import { diffRows, consolidateByPrecedence, selectBoundedScenario, rankPortfolio, calibrateConfidence, evaluateAutonomyGate } from '../src/lib/production-intelligence.ts';

const delta = diffRows(
  [{ key: 'a', hash: '1' }, { key: 'b', hash: '1' }],
  [{ key: 'a', hash: '2', value: 2 }, { key: 'c', hash: '3', value: 3 }],
);
assert.deepEqual(delta.map((x) => [x.key, x.state]), [['a', 'changed'], ['b', 'deleted'], ['c', 'new']]);

const consolidated = consolidateByPrecedence([
  { businessKey: 'x', sourceId: 'late', precedence: 2, observedAt: '2026-01-02', value: 2 },
  { businessKey: 'x', sourceId: 'authoritative', precedence: 1, observedAt: '2026-01-01', value: 1 },
]);
assert.equal(consolidated[0].sourceId, 'authoritative');

assert.equal(selectBoundedScenario([
  { key: 'blocked', expectedImpact: 100, risk: 9, liquidityRequired: 1, serviceLevel: 1 },
  { key: 'safe', expectedImpact: 80, risk: 2, liquidityRequired: 5, serviceLevel: 0.95 },
], { maxRisk: 3, protectedLiquidity: 5, minimumServiceLevel: 0.9 })?.key, 'safe');

assert.equal(rankPortfolio([{ key: 'high', materiality: 1, confidence: 0.95, urgency: 1, risk: 0.2 }], 1)[0].escalationRequired, true);
assert.equal(calibrateConfidence(0.8, []), 0);
assert.equal(calibrateConfidence(0.8, [{ expected: 100, actual: 100, quality: 1 }]) > 0.8, true);
assert.equal(calibrateConfidence(0.8, [{ expected: 100, actual: 100, quality: 2 }]), 0);
assert.deepEqual(evaluateAutonomyGate({ trustHealthy: true, evidenceQuality: 0.95, confidence: 0.95, riskBudgetValid: true, criticalDrift: false, rollbackVerified: true, isolationVerified: true }), { eligible: true, failures: [] });
assert.equal(evaluateAutonomyGate({ trustHealthy: true, evidenceQuality: 0.95, confidence: 0.95, riskBudgetValid: true, criticalDrift: true, rollbackVerified: true, isolationVerified: true }).eligible, false);
console.log('Production intelligence runtime: PASS');
