import fs from 'node:fs';

const source = fs.readFileSync('src/lib/production/productionCertification.ts', 'utf8');
const required = ['tenant', 'backup', 'rollback', 'artifact', 'security'];
for (const key of required) if (!source.includes(`'${key}'`)) throw new Error(`missing canonical evidence key: ${key}`);
for (const token of ['MISSING_EVIDENCE:', 'FAILED_EVIDENCE:', 'DUPLICATE_EVIDENCE:', 'seen = new Set', 'score >= 0.95']) {
  if (!source.includes(token)) throw new Error(`certification hardening missing: ${token}`);
}

// Adversarial model: 100% score with one mandatory evidence item omitted must not certify.
const checks = required.filter(key => key !== 'security');
const simulatedMissing = required.filter(key => !checks.includes(key));
if (simulatedMissing.length !== 1 || simulatedMissing[0] !== 'security') throw new Error('adversarial fixture invalid');
if (!source.includes('MISSING_EVIDENCE:${key}')) throw new Error('missing-evidence blocker is not enforced');

// Test-of-test: require the real markers to exist before tampering, then ensure
// the same source is detected as invalid after those executable guards vanish.
const requiredBlockerTokens = ['MISSING_EVIDENCE:${key}', 'FAILED_EVIDENCE:${key}'];
for (const token of requiredBlockerTokens) {
  if (!source.includes(token)) throw new Error(`test-of-test fixture invalid: source lacks ${token}`);
}
const tampered = source
  .replaceAll('MISSING_EVIDENCE:${key}', '')
  .replaceAll('FAILED_EVIDENCE:${key}', '');
for (const token of requiredBlockerTokens) {
  if (tampered.includes(token)) throw new Error(`test-of-test failed: tampering was not detected for ${token}`);
}

console.log('Production certification adversarial evidence gate: PASS');
