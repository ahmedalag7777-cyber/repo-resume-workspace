import fs from 'node:fs';
const files = {
  'src/lib/intelligence/productionReadiness.ts': ['evaluateProductionReadiness','BLOCKER','ready'],
  'src/lib/intelligence/decisionChain.ts': ['resolveDecisionChain','PROTECTED_LIQUIDITY_BREACH','CALIBRATION_INSUFFICIENT_DATA','DECISION_SCORE_BELOW_AUTOMATION_THRESHOLD','decisionFingerprint']
};
for (const [file,tokens] of Object.entries(files)) { const source=fs.readFileSync(file,'utf8'); for (const token of tokens) if(!source.includes(token)) throw new Error(`${file}: missing ${token}`); }
console.log('unified-production-decision-chain: PASS');
