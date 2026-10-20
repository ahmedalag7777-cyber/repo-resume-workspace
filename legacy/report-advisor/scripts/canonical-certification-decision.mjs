import { REQUIRED_CERTIFICATION_EVIDENCE_KEYS } from './certification-consumer-validation.mjs';

const reject = (reason) => { throw new Error(`CANONICAL_CERTIFICATION_REJECTED:${reason}`); };

export function evaluateCanonicalCertificationDecision({ decision, expectedSourceSha, expectedManifestId, expectedCertificationRunId }) {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) reject('MISSING_DECISION');
  if (decision.certification_result !== 'passed') reject('RESULT_NOT_PASSED');
  if (decision.blocker_state !== 'clear' || decision.blocker_count !== 0) reject('UNRESOLVED_BLOCKERS');
  if (decision.consumed_source_sha !== expectedSourceSha) reject('SOURCE_SHA_MISMATCH');
  if (decision.consumed_release_manifest_id !== expectedManifestId) reject('MANIFEST_ID_MISMATCH');
  if (decision.certification_run_id !== expectedCertificationRunId) reject('RUN_ID_MISMATCH');
  if (!Array.isArray(decision.required_contracts)) reject('REQUIRED_CONTRACTS_NOT_ARRAY');
  const expected = [...REQUIRED_CERTIFICATION_EVIDENCE_KEYS].sort();
  const actual = [...decision.required_contracts].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) reject('MANDATORY_CONTRACT_SET_MISMATCH');
  if (decision.identity?.source_sha_matches_manifest !== true) reject('SOURCE_IDENTITY_NOT_PROVEN');
  if (decision.identity?.manifest_id_matches_payload !== true) reject('MANIFEST_IDENTITY_NOT_PROVEN');
  if (decision.identity?.certification_run_id_matches_manifest !== true) reject('RUN_IDENTITY_NOT_PROVEN');
  return true;
}
