import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const manifestPath = process.env.RELEASE_EVIDENCE_MANIFEST_PATH || 'release-evidence/manifest.json';
const certificationPath = process.env.RELEASE_CERTIFICATION_DECISION_PATH || 'release-evidence/certification-decision.json';
const expectedSourceSha = process.env.EXPECTED_SOURCE_SHA || process.env.GITHUB_SHA || '';
const certificationRunId = process.env.RELEASE_CERTIFICATION_RUN_ID || '';
const artifactName = process.env.RELEASE_EVIDENCE_ARTIFACT_NAME || '';
const resolve = (value) => path.isAbsolute(value) ? value : path.join(root, value);
const proofPath = resolve(process.env.RELEASE_CONSUMPTION_PROOF_PATH || path.join(path.dirname(manifestPath), 'consumption-proof.json'));

if (!expectedSourceSha) throw new Error('Missing expected source SHA for release evidence boundary');
if (!certificationRunId) throw new Error('Missing release certification workflow run identity');
if (!artifactName) throw new Error('Missing release evidence artifact identity');
if (artifactName !== `report-advisor-release-evidence-${expectedSourceSha}`) throw new Error('Release evidence artifact is not bound to expected source SHA');

const manifestFile = resolve(manifestPath);
const certificationFile = resolve(certificationPath);
if (!fs.existsSync(manifestFile)) throw new Error(`Missing release evidence manifest: ${manifestPath}`);
if (!fs.existsSync(certificationFile)) throw new Error(`Missing certification decision: ${certificationPath}`);

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const certification = JSON.parse(fs.readFileSync(certificationFile, 'utf8'));

for (const field of ['schema_version', 'release_key', 'source_sha', 'certification_run_id', 'migrations_fingerprint', 'dependency_lock_fingerprint', 'artifact_fingerprint', 'environment', 'stabilization_seconds', 'evidence_contracts', 'manifest_id', 'generated_at']) {
  if (!(field in manifest)) throw new Error(`Release manifest missing ${field}`);
}
for (const field of ['schema_version', 'certification_decision_id', 'consumed_release_manifest_id', 'consumed_source_sha', 'certification_run_id', 'certification_result', 'blocker_count', 'blocker_state', 'identity', 'required_contracts', 'decided_at']) {
  if (!(field in certification)) throw new Error(`Certification decision missing ${field}`);
}

if (manifest.source_sha !== expectedSourceSha) throw new Error('Manifest source SHA does not match boundary source SHA');
if (manifest.certification_run_id !== certificationRunId) throw new Error('Manifest certification run does not match boundary run');
if (certification.consumed_source_sha !== expectedSourceSha) throw new Error('Certification decision source SHA mismatch');
if (certification.certification_run_id !== certificationRunId) throw new Error('Certification decision run identity mismatch');
if (certification.consumed_release_manifest_id !== manifest.manifest_id) throw new Error('Certification decision is not bound to consumed manifest');
if (certification.certification_result !== 'passed') throw new Error('Certification decision is not passed');
if (certification.blocker_count !== 0 || certification.blocker_state !== 'clear') throw new Error('Certification decision contains unresolved blockers');
if (manifest.stabilization_seconds < 0 || !Number.isInteger(manifest.stabilization_seconds)) throw new Error('Invalid stabilization window in release manifest');

const payload = {
  schema_version: manifest.schema_version,
  release_key: manifest.release_key,
  source_sha: manifest.source_sha,
  certification_run_id: manifest.certification_run_id,
  migrations_fingerprint: manifest.migrations_fingerprint,
  dependency_lock_fingerprint: manifest.dependency_lock_fingerprint,
  artifact_fingerprint: manifest.artifact_fingerprint,
  environment: manifest.environment,
  stabilization_seconds: manifest.stabilization_seconds,
  evidence_contracts: manifest.evidence_contracts,
};
const expectedManifestId = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if (manifest.manifest_id !== expectedManifestId) throw new Error('Release manifest fingerprint mismatch');
if (JSON.stringify(certification.required_contracts) !== JSON.stringify(manifest.evidence_contracts)) throw new Error('Certification contract set does not match release manifest');
if (certification.identity.source_sha_matches_manifest !== true) throw new Error('Certification identity does not confirm source binding');
if (certification.identity.manifest_id_matches_payload !== true) throw new Error('Certification identity does not confirm manifest integrity');
if (certification.identity.certification_run_id_matches_manifest !== true) throw new Error('Certification identity does not confirm run binding');

const proof = {
  schema_version: 1,
  proof_type: 'production-release-evidence-consumption',
  consumed_manifest_id: manifest.manifest_id,
  consumed_source_sha: manifest.source_sha,
  certification_run_id: certificationRunId,
  artifact_name: artifactName,
  certification_decision_id: certification.certification_decision_id,
  result: 'consumed-and-verified',
  verified_at: new Date().toISOString(),
};
fs.mkdirSync(path.dirname(proofPath), { recursive: true });
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + '\n');
console.log('Live production evidence boundary: PASS');
console.log(`consumed source SHA: ${manifest.source_sha}`);
console.log(`consumed certification run: ${certificationRunId}`);
console.log(`consumption proof: ${proofPath}`);
