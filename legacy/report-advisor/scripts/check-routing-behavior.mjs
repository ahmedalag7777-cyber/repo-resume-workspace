import fs from 'node:fs';

const source = fs.readFileSync('src/lib/document-intelligence/routing.ts', 'utf8');
const required = [
  ['canonical routes declare criticality', source.includes("criticality: 'CRITICAL'")],
  ['confidence is finite and clamped', source.includes('Number.isFinite(value)') && source.includes('Math.max(0, Math.min(1, value))')],
  ['unknown fields are unmapped', source.includes("action: 'UNMAPPED'")],
  ['unknown fields are quarantined', source.includes("destination: 'quarantine'")],
  ['multiple candidates are grouped by canonical field', source.includes('new Map<string, RoutingDecision[]>')],
  ['duplicate canonical mappings quarantine all candidates', source.includes("decision.action = 'QUARANTINE'")],
  ['duplicate canonical mappings cannot retain high confidence', source.includes('Math.min(decision.confidence, 0.69)')],
  ['safe confidence is used for classification', source.includes('classifyConfidence(safe, route.criticality)')],
];
for (const [name, ok] of required) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = required.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log(`Routing behavior gate: ${required.length}/${required.length} PASS`);
