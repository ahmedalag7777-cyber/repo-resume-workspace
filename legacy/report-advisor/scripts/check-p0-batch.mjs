import { spawn } from 'node:child_process';

const checks = [
  ['tenant-security', 'test:tenant-security-contract'],
  ['global-tenant-rls', 'test:global-tenant-rls'],
  ['import-tenant-context', 'test:import-rpc-tenant-context'],
  ['import-direct-write', 'test:import-direct-write-guard'],
  ['import-transaction', 'test:import-transaction-contract'],
  ['import-runtime', 'test:import-runtime-governance'],
  ['import-state', 'test:import-state-contract'],
  ['report-truth', 'test:report-truth'],
  ['workflow-command-integrity', 'test:workflow-command-integrity'],
  ['workflow-batch-integrity', 'test:workflow-batch-integrity'],
  ['quality-workflow', 'test:quality-workflow-contract'],
  ['production-blockers', 'test:production-release-blockers'],
  ['production-certification', 'test:production-certification-contract'],
];

const concurrency = Math.max(1, Math.min(6, Number(process.env.P0_CHECK_CONCURRENCY ?? 6)));
const results = new Array(checks.length);
let cursor = 0;

function run(label, script) {
  return new Promise((resolve) => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script, '--if-present'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => resolve({ label, script, code: 1, stdout, stderr: String(error) }));
    child.on('close', (code) => resolve({ label, script, code: code ?? 1, stdout, stderr }));
  });
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= checks.length) return;
    const [label, script] = checks[index];
    process.stdout.write(`\n[P0] START ${label} (${script})\n`);
    results[index] = await run(label, script);
    const result = results[index];
    process.stdout.write(`[P0] ${result.code === 0 ? 'PASS' : 'FAIL'} ${label} exit=${result.code}\n`);
    if (result.code !== 0 && result.stderr.trim()) process.stderr.write(result.stderr.slice(-4000) + '\n');
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, checks.length) }, worker));

const failed = results.filter((result) => result?.code !== 0);
console.log(`\nP0 family gate: ${checks.length - failed.length}/${checks.length} passed; ${failed.length} failed.`);
if (failed.length) {
  console.error('Failed families:');
  for (const result of failed) console.error(`- ${result.label}: ${result.script} (exit ${result.code})`);
  process.exit(1);
}
console.log('P0 family gate: PASS');
