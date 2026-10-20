import fs from 'node:fs';
const source = fs.readFileSync('src/lib/intelligence/decisionExplainability.ts', 'utf8');
for (const token of ['explainDecision', 'DecisionEvidence', 'confidence', 'decisionFingerprint', 'BLOCKED']) {
  if (!source.includes(token)) throw new Error(`decision-explainability: missing ${token}`);
}
console.log('decision-explainability-contract: PASS');
