import { strict as assert } from 'node:assert';
import { advanceCheckpoint, assertValidTransition, canAdvanceCheckpoint, createInitialCheckpoint, resumeFromCheckpoint } from '../src/lib/report-execution/checkpoint.ts';

const initial = createInitialCheckpoint('sha-a', ['z', 'a', 'a']);
assert.equal(initial.stage, 'queued');
assert.deepEqual(initial.evidenceKeys, ['a', 'z']);
assertValidTransition('queued', 'fingerprinted');
assert.equal(canAdvanceCheckpoint('queued', 'fingerprinted'), true);
assert.equal(canAdvanceCheckpoint('queued', 'analyzed'), false);
const fingerprinted = advanceCheckpoint(initial, { stage: 'fingerprinted', sourceHash: 'sha-a', evidenceKeys: ['source:sha-a'], rowCount: 10 });
assert.deepEqual(fingerprinted.evidenceKeys, ['a', 'source:sha-a', 'z']);
assert.throws(() => advanceCheckpoint(fingerprinted, { stage: 'analyzed', sourceHash: 'sha-a', evidenceKeys: [] }), /Invalid checkpoint transition/);
assert.throws(() => advanceCheckpoint(fingerprinted, { stage: 'extracted', sourceHash: 'sha-b', evidenceKeys: [] }), /source hash/);
assert.throws(() => advanceCheckpoint(fingerprinted, { stage: 'extracted', sourceHash: 'sha-a', evidenceKeys: [], rowCount: -1 }), /rowCount/);
assert.throws(() => createInitialCheckpoint(''), /source hash/);
assert.equal(resumeFromCheckpoint(fingerprinted), 'fingerprinted');
assert.throws(() => resumeFromCheckpoint({ ...fingerprinted, sourceHash: '' }), /source hash/);
console.log('Report execution checkpoint hardening: PASS');
