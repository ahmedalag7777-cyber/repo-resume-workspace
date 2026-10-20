import fs from 'node:fs';

const gate = fs.readFileSync('src/lib/document-intelligence/decision-gate.ts', 'utf8');
const validation = fs.readFileSync('src/lib/document-intelligence/validation.ts', 'utf8');

const required = [
  "validationStatus",
  "reconciliationPassed",
  "VALIDATION_FAILED",
  "VALIDATION_REQUIRED",
  "RECONCILIATION_REQUIRED",
  "RECONCILIATION_FAILED",
  "NON_FINITE_CONFIDENCE",
  "QUARANTINE",
  "classifyConfidence"
];

for (const token of required) {
  if (!gate.includes(token)) throw new Error(`Decision gate missing required contract: ${token}`);
}

if (!/input\.validationStatus\s*!==\s*'PASS'/.test(gate)) {
  throw new Error('Decision gate must block non-PASS validation before approval.');
}
if (!/input\.reconciliationPassed\s*!==\s*true/.test(gate)) {
  throw new Error('Decision gate must require explicit successful reconciliation before approval.');
}
if (!/input\.reconciliationPassed\s*===\s*false/.test(gate)) {
  throw new Error('Decision gate must quarantine explicit reconciliation failures.');
}
if (!/RECONCILIATION_REQUIRED/.test(gate)) {
  throw new Error('Decision gate must distinguish missing reconciliation evidence from failed reconciliation.');
}
if (!/Number\.isFinite\(input\.confidence\)/.test(gate)) {
  throw new Error('Decision gate must fail closed on non-finite confidence.');
}
if (!/CRITICAL.*0\.95/.test(validation)) {
  throw new Error('Critical confidence policy changed unexpectedly.');
}

console.log('Document intelligence decision gate contract: PASS');
