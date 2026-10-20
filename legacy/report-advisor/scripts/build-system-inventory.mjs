import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', '.next']);
const files = [];
const dirs = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll(path.sep, '/');
    if (entry.isDirectory()) {
      dirs.push(rel);
      walk(full);
    } else {
      files.push(rel);
    }
  }
}

walk(root);

const byRoot = {};
for (const file of files) {
  const rootName = file.split('/')[0];
  byRoot[rootName] ??= { files: 0, examples: [] };
  byRoot[rootName].files += 1;
  if (byRoot[rootName].examples.length < 12) byRoot[rootName].examples.push(file);
}

const workflows = files.filter((f) => f.startsWith('.github/workflows/') && f.endsWith('.yml'));
const migrations = files.filter((f) => f.startsWith('supabase/migrations/') && f.endsWith('.sql'));
const checks = files.filter((f) => f.startsWith('scripts/check-') || f.startsWith('scripts/check_'));
const tests = files.filter((f) => /(^|\/)(test|tests|.*\.test\.)/.test(f));
const docs = files.filter((f) => f.startsWith('docs/'));
const source = files.filter((f) => f.startsWith('src/'));
const service = files.filter((f) => f.startsWith('services/'));

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scriptNames = Object.keys(pkg.scripts ?? {});

const inventory = {
  generatedAt: new Date().toISOString(),
  gitRef: process.env.GITHUB_SHA ?? 'local',
  totals: { files: files.length, directories: dirs.length },
  surfaces: {
    workflows,
    migrations,
    checks,
    tests,
    docs,
    source,
    service,
    packageScripts: scriptNames,
  },
  byRoot,
};

fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts/project-system-inventory.json'), JSON.stringify(inventory, null, 2));

const md = [
  '# Project System Inventory',
  '',
  `Generated: ${inventory.generatedAt}`,
  `Git ref: ${inventory.gitRef}`,
  '',
  '## Totals',
  `- Files: ${files.length}`,
  `- Directories: ${dirs.length}`,
  `- Workflows: ${workflows.length}`,
  `- Supabase migrations: ${migrations.length}`,
  `- check-* scripts: ${checks.length}`,
  `- Test-like files: ${tests.length}`,
  `- Documentation files: ${docs.length}`,
  `- src files: ${source.length}`,
  `- service files: ${service.length}`,
  `- package scripts: ${scriptNames.length}`,
  '',
  '## Root surfaces',
  ...Object.entries(byRoot).map(([name, value]) => `- ${name}: ${value.files} files (${value.examples.join(', ')})`),
  '',
  '## Purpose',
  'This inventory is generated from the checked-out repository itself. It is a structural source-of-truth aid; completion status still requires capability-to-implementation-to-execution-to-evidence mapping in the Master Execution Index.',
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'artifacts/PROJECT_SYSTEM_INVENTORY.md'), md);
console.log(`Inventory generated: ${files.length} files, ${workflows.length} workflows, ${migrations.length} migrations, ${checks.length} check scripts, ${scriptNames.length} package scripts.`);
