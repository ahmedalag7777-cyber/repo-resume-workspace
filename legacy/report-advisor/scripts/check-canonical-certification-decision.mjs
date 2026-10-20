import { strict as assert } from 'node:assert';
import { evaluateCanonicalCertificationDecision } from './canonical-certification-decision.mjs';
import { REQUIRED_CERTIFICATION_EVIDENCE_KEYS } from './certification-consumer-validation.mjs';

const expectedSourceSha = 'a'.repeat(40);
const expectedManifestId = 'manifest-001';
const expectedCertificationRunId = 'run-001';

const valid = {
  certification_result: 'passed',
  blocker_state: 'clear',
  blocker_count: 0,
  consumed_source_sha: expectedSourceSha,
  consumed_release_manifest_id: expectedManifestId,
  certification_run_id: expectedCertificationRunId,
  required_contracts: [...REQUIRED_CERTIFICATION_EVIDENCE_KEYS],
  identity: {
    source_sha_matches_manifest: true,
    manifest_id_matches_payload: true,
    certification_run_id_matches_manifest: true,
  },
};

assert.equal(evaluateCanonicalCertificationDecision({ decision: valid, expectedSourceSha, expectedManifestId, expectedCertificationRunId }), true);

const rejects = [
  ['result', { certification_result: 'failed' }, 'RESULT_NOT_PASSED'],
  ['blocker state', { blocker_state: 'open' }, 'UNRESOLVED_BLOCKERS'],
  ['blocker count', { blocker_count: 1 }, 'UNRESOLVED_BLOCKERS'],
  ['source sha', { consumed_source_sha: 'b'.repeat(40) }, 'SOURCE_SHA_MISMATCH'],
  ['manifest id', { consumed_release_manifest_id: 'manifest-002' }, 'MANIFEST_ID_MISMATCH'],
  ['run id', { certification_run_id: 'run-002' }, 'RUN_ID_MISMATCH'],
  ['contracts type', { required_contracts: null }, 'REQUIRED_CONTRACTS_NOT_ARRAY'],
  ['contracts set', { required_contracts: ['tenant'] }, 'MANDATORY_CONTRACT_SET_MISMATCH'],
  ['source identity', { identity: { ...valid.identity, source_sha_matches_manifest: false } }, 'SOURCE_IDENTITY_NOT_PROVEN'],
  ['manifest identity', { identity: { ...valid.identity, manifest_id_matches_payload: false } }, 'MANIFEST_IDENTITY_NOT_PROVEN'],
  ['run identity', { identity: { ...valid.identity, certification_run_id_matches_manifest: false } }, 'RUN_IDENTITY_NOT_PROVEN'],
];

for (const [name, patch, reason] of rejects) {
  assert.throws(() => evaluateCanonicalCertificationDecision({ decision: { ...valid, ...patch }, expectedSourceSha, expectedManifestId, expectedCertificationRunId }), new RegExp(`CANONICAL_CERTIFICATION_REJECTED:${reason}`), name);
}

assert.throws(() => evaluateCanonicalCertificationDecision({ decision: null, expectedSourceSha, expectedManifestId, expectedCertificationRunId }), /CANONICAL_CERTIFICATION_REJECTED:MISSING_DECISION/);
assert.throws(() => evaluateCanonicalCertificationDecision({ decision: { ...valid, required_contracts: [...valid.required_contracts, 'tenant'] }, expectedSourceSha, expectedManifestId, expectedCertificationRunId }), /CANONICAL_CERTIFICATION_REJECTED:MANDATORY_CONTRACT_SET_MISMATCH/);

console.log('Canonical certification decision contract PASS: positive path + blocker/result/source/manifest/run/contract/identity adversarial rejection.');
