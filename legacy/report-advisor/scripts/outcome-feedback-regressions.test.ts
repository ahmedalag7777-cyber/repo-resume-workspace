import assert from 'node:assert/strict';
import { recordOutcome, summarizeOutcomes } from '../src/lib/analytics/outcome-feedback-core.ts';

const base = {
  tenantId: 'tenant-a',
  decisionFingerprint: 'decision-1',
  evidenceSnapshotId: 'snapshot-1',
  observedAt: '2026-08-26T00:00:00Z',
  label: 'correct' as const,
  expectedValue: 100,
  actualValue: 110,
};

const first = recordOutcome([], base);
assert.equal(first.length, 1);
const sameRecommendationLater = recordOutcome(first, { ...base, observedAt: '2026-08-27T00:00:00Z', evidenceSnapshotId: 'snapshot-2' });
assert.equal(sameRecommendationLater.length, 1);
assert.throws(() => recordOutcome([], { ...base, actualValue: undefined }), /OUTCOME_VALUES_REQUIRED_FOR_KNOWN_LABEL/);
assert.throws(() => recordOutcome([], { ...base, actualValue: Number.NaN }), /OUTCOME_INVALID_NUMBER:actualValue/);
assert.throws(() => recordOutcome([], { ...base, observedAt: 'invalid-date' }), /Outcome timestamp is invalid/);

const noImpact = summarizeOutcomes([{ ...base, impactValue: undefined }], 'tenant-a');
assert.equal(noImpact.count, 1);
assert.equal(noImpact.impact, null);
assert.equal(noImpact.accuracy, 1);
assert.equal(noImpact.coverage, 1);

const unknownOnly = summarizeOutcomes([{ ...base, label: 'unknown', actualValue: undefined, expectedValue: undefined }], 'tenant-a');
assert.equal(unknownOnly.accuracy, null);
assert.equal(unknownOnly.coverage, 0);
assert.equal(unknownOnly.impact, null);

console.log('PASS: outcome identity matches persistence contract, known labels require values, tenant scope is explicit, and missing impact/accuracy remain unknown rather than zero.');
