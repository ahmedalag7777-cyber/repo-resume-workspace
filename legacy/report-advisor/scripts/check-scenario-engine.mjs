import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('src/lib/intelligence/scenarioEngine.ts');
const source = readFileSync(file, 'utf8');
const required = [
  "export function runScenario",
  "status: 'READY' | 'INVALID'",
  'deltaPct',
  'assumptions',
  'reversible',
];
const missing = required.filter(token => !source.includes(token));
if (missing.length) {
  console.error(`Scenario engine contract failed: ${missing.join(', ')}`);
  process.exit(1);
}

if (source.includes('Math.random') || source.includes('Date.now')) {
  console.error('Scenario engine must remain deterministic.');
  process.exit(1);
}

console.log('Scenario engine contract: PASS');
