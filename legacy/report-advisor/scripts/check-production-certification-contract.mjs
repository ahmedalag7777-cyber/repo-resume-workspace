import fs from 'node:fs';

const files = {
  'src/lib/production/productionCertification.ts': ['certifyProduction', 'BLOCKER', 'certified', '0.95'],
  'src/lib/entitlements/entitlementPolicy.ts': ['decideEntitlement', 'MISSING_TENANT', 'EXPIRED', 'QUOTA_EXCEEDED', 'CAPABILITY_DISABLED'],
};

for (const [file, tokens] of Object.entries(files)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
  }
}

const certificationSource = fs.readFileSync('src/lib/production/productionCertification.ts', 'utf8');
const evidenceKeysMatch = certificationSource.match(
  /PRODUCTION_CERTIFICATION_EVIDENCE_KEYS\s*:[^=]+?=\s*\[([\s\S]*?)\];/,
);
if (!evidenceKeysMatch) {
  throw new Error('productionCertification.ts: missing canonical PRODUCTION_CERTIFICATION_EVIDENCE_KEYS export');
}

const canonicalEvidenceKeys = [...evidenceKeysMatch[1].matchAll(/['\"]([a-z_]+)['\"]/g)].map((match) => match[1]);
const requiredEvidenceKeys = ['tenant', 'backup', 'rollback', 'artifact', 'security'];
for (const key of requiredEvidenceKeys) {
  if (!canonicalEvidenceKeys.includes(key)) {
    throw new Error(`productionCertification.ts: canonical evidence key missing ${key}`);
  }
}

const expected = JSON.stringify(requiredEvidenceKeys);
const actual = JSON.stringify(canonicalEvidenceKeys);
if (actual !== expected) {
  throw new Error(`productionCertification.ts: canonical evidence keys mismatch; expected ${expected}, found ${actual}`);
}

console.log('production certification and entitlement contracts: PASS');
console.log(`canonical production evidence keys: ${canonicalEvidenceKeys.join(', ')}`);
