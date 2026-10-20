import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/quality.yml', 'utf8');
const scripts = pkg.scripts ?? {};
const commands = [...workflow.matchAll(/run:\s*npm run ([^\s]+)/g)].map((m) => m[1]);

if (commands.length === 0) throw new Error('Quality workflow contains no npm test commands.');

const uniqueCommands = [...new Set(commands)];
const missing = uniqueCommands.filter((name) => !scripts[name]);
if (missing.length) {
  throw new Error(`Quality workflow references missing npm scripts: ${missing.join(', ')}`);
}

if (!workflow.includes('workflow_dispatch:')) throw new Error('Quality workflow must remain manually dispatchable.');
if (!workflow.includes('npm ci --no-audit --no-fund')) throw new Error('Quality workflow must use locked, non-auditing dependency installation.');
if (!workflow.includes('npm run typecheck') || !workflow.includes('npm run lint') || !workflow.includes('npm run build')) throw new Error('Quality workflow must retain typecheck, lint, and build gates.');

const requiredStageGroups = [
  ['Vercel deploy workflow contract'],
  ['Quality workflow contract'],
  ['Typecheck'],
  ['Lint'],
  ['Build'],
  ['Performance budget'],
  ['Global tenant RLS'],
  ['Import RPC tenant context'],
  ['Import business key'],
  ['Report truth contract', 'Secondary consumer canonical data truth'],
  ['Production readiness', 'Production release blockers'],
];
const missingGroups = requiredStageGroups.filter((group) => !group.some((stage) => workflow.includes(`- name: ${stage}`)));
if (missingGroups.length) {
  throw new Error(`Quality workflow is missing mandatory stages: ${missingGroups.map((group) => group.join(' OR ')).join(', ')}`);
}

const concurrencyMatch = workflow.match(/concurrency:\s*\r?\n(?:\s*#.*\r?\n)*\s*group:\s*(.+)\r?\n\s*cancel-in-progress:\s*(true|false)/m);
if (!concurrencyMatch) throw new Error('Quality workflow must define an explicit concurrency policy.');
const concurrencyGroup = concurrencyMatch[1].trim();
const cancelInProgress = concurrencyMatch[2] === 'true';
if (!/\$\{\{\s*github\.run_id\s*\}\}/.test(concurrencyGroup)) throw new Error('Quality workflow must define a unique per-run concurrency group.');
if (cancelInProgress) throw new Error('Quality workflow must not cancel an in-flight verification run.');
if (!/timeout-minutes:\s*40/.test(workflow)) throw new Error('Quality workflow must retain an explicit 40-minute execution timeout.');

console.log(`Quality workflow contract: PASS (${uniqueCommands.length} npm commands, ${requiredStageGroups.length} mandatory stage groups, per-run concurrency)`);
