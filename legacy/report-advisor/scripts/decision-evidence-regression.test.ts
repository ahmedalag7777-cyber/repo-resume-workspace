import assert from 'node:assert/strict';
import { createDecision } from '../src/lib/free-toolbox/decision-log.ts';

assert.throws(() => createDecision({
  title: 'بدون دليل', reason: 'invalid', status: 'proposed', priority: 1, evidenceIds: [], action: 'HOLD',
}), /DECISION_EVIDENCE_REQUIRED/);

const decision = createDecision({
  title: 'قرار موثق', reason: 'evidence-backed', status: 'proposed', priority: 1,
  evidenceIds: [' evidence-1 ', 'evidence-1', 'evidence-2'], action: 'BUY_SOON',
});
assert.deepEqual(decision.evidenceIds, ['evidence-1', 'evidence-2']);
console.log('PASS: decision creation is fail-closed and evidence IDs are normalized/deduplicated.');
