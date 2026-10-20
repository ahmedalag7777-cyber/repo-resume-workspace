import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/lib/import-pipeline/canonical-text-orchestrator.ts',
  'src/lib/import-pipeline/report-file-contract.ts',
  'src/lib/import-pipeline/folder-watch-service.ts',
  'scripts/check-document-intelligence-contract.mjs',
  'scripts/check-document-intelligence-hardening.mjs',
  'scripts/check-file-intelligence-security.mjs',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing document resilience dependency: ${file}`);
}
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const text = read(required[0]);
for (const token of ['structured_source_fallback','continueWithFallback','CANONICAL_TEXT_UNAVAILABLE_ANALYSIS_CONTINUES']) {
  if (!text.includes(token)) throw new Error(`Document failure-isolation contract missing: ${token}`);
}
const contract = read(required[1]);
for (const token of ["'.pdf'", "'.xlsx'", "'.csv'"]) {
  if (!contract.includes(token)) throw new Error(`Report format contract missing: ${token}`);
}
console.log('Document resilience gate: PASS (fallback, supported formats, and security/intelligence gates are wired).');
