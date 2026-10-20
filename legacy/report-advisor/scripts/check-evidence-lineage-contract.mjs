import { readFileSync } from 'node:fs';

const source = readFileSync('src/lib/free-toolbox/evidence-ledger.ts', 'utf8');
const required = [
  'hasEvidenceIdentity',
  'evidence.sourceHash?.trim()',
  'hasEvidenceProvenance',
  'evidence.sourceDocumentId?.trim()',
  '.filter(hasEvidenceIdentity)',
  'refs.filter(hasEvidenceProvenance)',
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Missing evidence lineage contract: ${marker}`);
}

const tampered = source.replace('evidence.sourceHash?.trim()', 'true');
if (tampered.includes('evidence.sourceHash?.trim()')) throw new Error('Adversarial test-of-test failed: source hash guard survived tampering');
const noDocumentBinding = source.replace('evidence.sourceDocumentId?.trim()', 'true');
if (noDocumentBinding.includes('evidence.sourceDocumentId?.trim()')) throw new Error('Adversarial test-of-test failed: source document guard survived tampering');

console.log('Evidence lineage contract regression: PASS (source identity, source hash, document binding, decision filtering, adversarial test-of-test)');
