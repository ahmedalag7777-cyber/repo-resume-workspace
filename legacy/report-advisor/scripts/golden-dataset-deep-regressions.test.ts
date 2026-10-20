import assert from 'node:assert/strict';
import { GOLDEN_CASES, evaluateGoldenCase, scoreGoldenCases } from '../src/lib/document-intelligence/golden-dataset.ts';

assert.equal(GOLDEN_CASES.length, 8);
assert.ok(GOLDEN_CASES.every(c => c.input.rows.length > 0));
assert.ok(GOLDEN_CASES.every(c => c.expectedFields.length > 0));
assert.ok(GOLDEN_CASES.every(c => c.expectedNormalized.length > 0));
assert.ok(GOLDEN_CASES.every(c => c.expectedEvidence.length > 0));
assert.ok(GOLDEN_CASES.every(c => c.minConfidence >= 0 && c.minConfidence <= 1));

const sample = GOLDEN_CASES[0];
const passing = evaluateGoldenCase(sample, {
  fields: sample.expectedFields,
  normalized: sample.expectedNormalized,
  evidence: sample.expectedEvidence,
  confidence: sample.minConfidence,
});
assert.equal(passing.passed, true);

const wrongNormalization = evaluateGoldenCase(sample, {
  fields: sample.expectedFields,
  normalized: [{ sku: 'WRONG' }],
  evidence: sample.expectedEvidence,
  confidence: 0.99,
});
assert.equal(wrongNormalization.passed, false);
assert.equal(wrongNormalization.normalizedMatched, false);

const missingEvidence = evaluateGoldenCase(sample, {
  fields: sample.expectedFields,
  normalized: sample.expectedNormalized,
  evidence: [],
  confidence: 0.99,
});
assert.equal(missingEvidence.passed, false);
assert.equal(missingEvidence.evidencePresent, false);

const insufficientConfidence = evaluateGoldenCase(sample, {
  fields: sample.expectedFields,
  normalized: sample.expectedNormalized,
  evidence: sample.expectedEvidence,
  confidence: sample.minConfidence - 0.01,
});
assert.equal(insufficientConfidence.passed, false);

const score = scoreGoldenCases(GOLDEN_CASES.map(c => ({ id: c.id, passed: true })));
assert.equal(score.cases, 8);
assert.equal(score.accuracy, 1);
assert.equal(score.ready, true);

console.log('PASS: deep golden corpus requires schema, normalized output, evidence provenance, and confidence; semantic mismatches cannot be hidden by a high score.');
