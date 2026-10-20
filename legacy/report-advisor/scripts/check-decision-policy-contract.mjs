import fs from 'node:fs';
const source = fs.readFileSync('src/lib/intelligence/decisionPolicy.ts', 'utf8');
for (const token of ['evaluateDecisionPolicy', 'HIGH_IMPACT_APPROVAL_REQUIRED', 'CALIBRATION_INSUFFICIENT_DATA', 'AUTOMATE', 'BLOCK']) {
  if (!source.includes(token)) throw new Error(`decision-policy: missing ${token}`);
}
console.log('decision-policy-contract: PASS');
