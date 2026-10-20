import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const files = [
  'scripts/check-release-evidence-completeness.mjs',
  'scripts/check-production-certification-chain.mjs',
  'scripts/check-autonomy-safety-chain.mjs',
];
const text = files.map((f) => {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) throw new Error(`Missing fail-closed gate: ${f}`);
  return fs.readFileSync(p, 'utf8').toLowerCase();
}).join('\n');
for (const token of ['fail-closed', 'artifact', 'rollback', 'trust', 'certification']) {
  if (!text.includes(token)) throw new Error(`Production fail-closed invariant missing: ${token}`);
}
if (/catch\s*\([^)]*\)\s*\{[^}]*console\.log/i.test(text)) throw new Error('Silent catch detected in production gates');
console.log('Production evidence fail-closed: PASS');
