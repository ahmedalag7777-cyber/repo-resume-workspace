import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowDir = path.join(root, '.github/workflows');
const workflows = fs.readdirSync(workflowDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
const names = workflows.map((f) => fs.readFileSync(path.join(workflowDir, f), 'utf8'));
const master = names.find((t) => t.includes('master-production-verification'));
if (!master) throw new Error('Master production verification workflow missing');

const gates = [
  'check-autonomy-safety-chain.mjs',
  'check-final-safety-invariants.mjs',
  'check-production-release-blockers.mjs',
  'check-production-certification-contract.mjs',
];
for (const gate of gates) {
  const occurrences = names.reduce((n, text) => n + (text.match(new RegExp(gate.replaceAll('.', '\\.'), 'g')) ?? []).length, 0);
  if (occurrences < 1) throw new Error(`Critical gate disappeared from CI: ${gate}`);
}

const repeatedMaster = names.filter((t) => t.includes('master-production-verification.yml')).length;
if (repeatedMaster > 1) throw new Error('Multiple workflows recursively reference the master verification workflow');
console.log('Master duplication budget: PASS');
