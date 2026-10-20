import fs from 'node:fs';
const source = fs.readFileSync('src/lib/intelligence/decisionCalibration.ts', 'utf8');
for (const token of ['calibrateDecisionThreshold', 'precision', 'recall', 'falsePositiveRate', 'INSUFFICIENT_DATA', 'recommendation']) {
  if (!source.includes(token)) throw new Error(`decision-calibration: missing ${token}`);
}
console.log('decision-calibration-contract: PASS');
