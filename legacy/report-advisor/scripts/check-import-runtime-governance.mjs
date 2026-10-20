import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dirs = ['src/lib', 'src/services'];
const files = [];
for (const dir of dirs) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(full);
    }
  }
}

const forbidden = /supabase\.from\(\s*['"](?:products|orders|import_job_rows|import_jobs)['"]\s*\)\s*\.\s*(?:insert|upsert|update)\s*\(/i;
const allowedMarkers = /import-upsert|unified-import|runImportJob/i;
const violations = [];
for (const file of files) {
  const body = fs.readFileSync(file, 'utf8');
  if (forbidden.test(body) && !allowedMarkers.test(body)) violations.push(file);
}
if (violations.length) throw new Error(`Runtime import governance violation:\n${violations.join('\n')}`);
console.log(`Import runtime governance: PASS (${files.length} source files scanned)`);
