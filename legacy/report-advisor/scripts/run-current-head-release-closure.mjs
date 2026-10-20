import { spawn } from 'node:child_process';

const stages = [
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['build', 'npm', ['run', 'build']],
  ['lint', 'npm', ['run', 'lint']],
  ['ui-route-parity', 'npm', ['run', 'test:ui-route-sidebar-parity']],
  ['migration-schema', 'npm', ['run', 'test:migration-schema-audit']],
  ['migration-dependencies', 'npm', ['run', 'test:migration-dependencies']],
  ['import-security', 'npm', ['run', 'test:import-direct-write-guard']],
  ['import-runtime-governance', 'npm', ['run', 'test:import-runtime-governance']],
  ['document-intelligence', 'npm', ['run', 'test:document-intelligence-closure']],
  ['golden-e2e-corpus', 'npm', ['run', 'test:golden-e2e-corpus']],
  ['decision-intelligence', 'npm', ['run', 'test:decision-intelligence-closure']],
  ['watched-folder', 'npm', ['run', 'test:watched-report-pipeline']],
  ['production-resilience', 'npm', ['run', 'test:production-readiness']],
  ['performance-scale', 'npm', ['run', 'test:production-scale']],
  ['release-blockers', 'npm', ['run', 'test:production-release-blockers']],
  ['phase-l-runtime-contract', 'npm', ['run', 'test:phase-l-runtime']],
  ['tenant-adversarial-browser', 'node', ['scripts/tenant-adversarial-browser-e2e.mjs']],
];

const parallelism = Math.max(1, Math.min(stages.length, Number(process.env.RELEASE_CLOSURE_PARALLELISM || 6)));
const results = [];
let cursor = 0;

function run([name, command, args]) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let output = '';
    const append = chunk => { output = `${output}${chunk}`.slice(-10000); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', error => resolve({ name, status: 'FAIL', code: null, durationMs: Date.now() - started, output: `${output}\n${error.message}` }));
    child.on('close', code => resolve({ name, status: code === 0 ? 'PASS' : code === 2 ? 'BLOCKED' : 'FAIL', code, durationMs: Date.now() - started, output }));
  });
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= stages.length) return;
    const stage = stages[index];
    console.log(`START ${stage[0]}`);
    const result = await run(stage);
    results[index] = result;
    console.log(`${result.status} ${result.name} ${result.durationMs}ms`);
  }
}

await Promise.all(Array.from({ length: parallelism }, worker));
console.log('\n=== CURRENT HEAD RELEASE CLOSURE ===');
for (const result of results) console.log(`${result.status.padEnd(7)} ${result.name} ${result.durationMs}ms`);
const failed = results.filter(r => r.status === 'FAIL');
const blocked = results.filter(r => r.status === 'BLOCKED');
console.log(`TOTAL=${results.length} PASS=${results.length - failed.length - blocked.length} BLOCKED=${blocked.length} FAIL=${failed.length}`);
if (failed.length) {
  for (const result of failed) console.error(`\n--- ${result.name} ---\n${result.output}`);
  process.exitCode = 1;
} else if (blocked.length) process.exitCode = 2;
