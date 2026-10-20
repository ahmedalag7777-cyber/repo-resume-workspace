import assert from 'node:assert/strict';
import { buildDecisionPortfolio, assessReleaseReadiness, assertNoCrossTenantEvidence, LIFECYCLE_PHASES } from '../src/lib/k-to-s-runtime.ts';

const portfolio = buildDecisionPortfolio([
  { key: 'critical', materiality: 1, confidence: 0.95, urgency: 1, risk: 0.2 },
  { key: 'low', materiality: 0.2, confidence: 0.7, urgency: 0.2, risk: 0.1 },
], 1);
assert.equal(portfolio[0].key, 'critical');
assert.equal(portfolio[0].priority > 0, true);
assert.equal(portfolio[0].materiality, 1);
assert.equal(portfolio[0].risk, 0.2);

const evidence = LIFECYCLE_PHASES.flatMap((phase) => [{ key: `${phase}:ok`, phase, passed: true, score: 1 }]);
const readiness = assessReleaseReadiness(evidence);
assert.equal(readiness.ready, true);
assert.equal(readiness.completedPhases.length, LIFECYCLE_PHASES.length);
assert.throws(() => assertNoCrossTenantEvidence([{ key: 'x', phase: 'K', passed: true, details: { tenantId: 'B' } }], 'A'), /cross-tenant/);
console.log('K-S runtime integration: PASS');
