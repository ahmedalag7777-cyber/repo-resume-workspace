import fs from 'node:fs';

const source = fs.readFileSync('src/lib/report-intelligence/report-advisory-orchestrator.ts', 'utf8');

if (!source.includes('provenance.evidenceSnapshotId && provenance.evidencePassportId')) {
  throw new Error('VERIFIED_STATE_REQUIRES_COMPLETE_EVIDENCE_CHAIN');
}
if (source.includes("return provenance.evidenceSnapshotId || provenance.evidencePassportId ? 'VERIFIED'")) {
  throw new Error('SINGLE_EVIDENCE_REFERENCE_CAN_UPGRADE_TO_VERIFIED');
}

console.log('ADVISORY_PROOF_STATE_CONTRACT=PASS');
