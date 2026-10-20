import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const rootScripts = new Set(Object.keys(packageJson.scripts ?? {}));
const packageScriptCache = new Map();
const files = fs.readdirSync(workflowDir).filter((f) => /\.ya?ml$/.test(f));
const missing = new Set();
const re = /npm\s+(?:--prefix\s+([^\s]+)\s+)?run\s+([A-Za-z0-9:_-]+)/g;

function scriptsForPrefix(prefix) {
  if (!prefix) return rootScripts;
  if (packageScriptCache.has(prefix)) return packageScriptCache.get(prefix);
  const packagePath = path.resolve(root, prefix, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = new Set(Object.keys(pkg.scripts ?? {}));
    packageScriptCache.set(prefix, scripts);
    return scripts;
  } catch {
    const empty = new Set();
    packageScriptCache.set(prefix, empty);
    return empty;
  }
}

for (const file of files) {
  const text = fs.readFileSync(path.join(workflowDir, file), 'utf8');
  for (const match of text.matchAll(re)) {
    const prefix = match[1] ?? '';
    const command = match[2];
    if (!scriptsForPrefix(prefix).has(command)) {
      missing.add(`${file}: ${prefix ? `npm --prefix ${prefix} ` : ''}npm run ${command}`);
    }
  }
}

if (missing.size) {
  console.error('Workflow command integrity FAILED');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}
console.log(`Workflow command integrity PASS (${files.length} workflows)`);
