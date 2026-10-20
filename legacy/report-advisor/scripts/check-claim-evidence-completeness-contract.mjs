import fs from 'node:fs';

const adapter = fs.readFileSync('src/lib/report-intelligence/report-claim-adapter.ts', 'utf8');
const ledger = fs.readFileSync('src/lib/report-intelligence/claim-ledger.ts', 'utf8');

if (!adapter.includes('provenance.evidenceSnapshotId && provenance.evidencePassportId ?')) {
  throw new Error('CLAIM_VALID_REQUIRES_COMPLETE_EVIDENCE_CHAIN');
}
if (!ledger.includes('Boolean(claim.evidenceSnapshotId && claim.evidencePassportId)')) {
  throw new Error('CLAIM_DECISION_READY_REQUIRES_COMPLETE_EVIDENCE_CHAIN');
}

console.log('CLAIM_EVIDENCE_COMPLETENESS_CONTRACT=PASS');
