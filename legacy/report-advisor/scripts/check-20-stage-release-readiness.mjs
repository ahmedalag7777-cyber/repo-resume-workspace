import { spawn } from 'node:child_process';

const stages = [
  ['01-build-typecheck', ['typecheck', 'build']],
  ['02-lint', ['lint']],
  ['03-architecture', ['test:contracts']],
  ['04-auth-tenant', ['test:auth-tenant-convergence']],
  ['05-rls', ['test:global-tenant-rls']],
  ['06-migration-schema', ['test:migration-schema-audit']],
  ['07-migration-dependencies', ['test:migration-dependencies']],
  ['08-import-security', ['test:import-direct-write-guard']],
  ['09-import-transaction', ['test:import-transaction-contract']],
  ['10-import-runtime', ['test:import-runtime-governance']],
  ['11-file-intelligence', ['test:file-engine-capability-contract']],
  ['12-schema-intelligence', ['test:schema-intelligence']],
  ['13-document-intelligence', ['test:document-intelligence-closure']],
  ['14-data-truth', ['test:data-quality-projections']],
  ['15-business-intelligence', ['test:consolidated-intelligence']],
  ['16-decision-intelligence', ['test:decision-intelligence-closure']],
  ['17-watched-folder', ['test:cross-platform-folder-capability']],
  ['18-production-resilience', ['test:production-readiness']],
  ['19-performance-scale', ['test:production-scale']],
  ['20-release-blockers', ['test:production-release-blockers']],
];


function npmInvocation(script) {
  if (process.platform === 'win32') return { command: 'cmd.exe', args: ['/d', '/s', '/c', `npm run ${script}`] };
  return { command: 'npm', args: ['run', script] };
}

const maxParallel = Math.max(1, Number(process.env.READINESS_PARALLELISM ?? 5));
const maxOutputChars = 12000;
const results = new Map();
let cursor = 0;

function runStage([name, scripts]) {
  return new Promise((resolve) => {
    const started = Date.now();
    const first = npmInvocation(scripts[0]);
    const child = spawn(first.command, first.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let output = '';
    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > maxOutputChars) output = output.slice(-maxOutputChars);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('close', (firstCode, signal) => {
      if (firstCode !== 0) {
        results.set(name, { status: 'FAIL', scripts, code: firstCode, signal, durationMs: Date.now() - started, output });
        resolve();
        return;
      }
      if (scripts.length === 1) {
        results.set(name, { status: 'PASS', scripts, code: 0, signal: null, durationMs: Date.now() - started, output });
        resolve();
        return;
      }
      const second = npmInvocation(scripts[1]);
      const next = spawn(second.command, second.args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      });
      next.stdout.on('data', append);
      next.stderr.on('data', append);
      next.on('close', (code, nextSignal) => {
        results.set(name, {
          status: code === 0 ? 'PASS' : 'FAIL',
          scripts,
          code,
          signal: nextSignal,
          durationMs: Date.now() - started,
          output,
        });
        resolve();
      });
      next.on('error', (error) => {
        results.set(name, { status: 'FAIL', scripts, code: null, signal: null, durationMs: Date.now() - started, output: `${output}\n${error.message}`.slice(-maxOutputChars) });
        resolve();
      });
    });
    child.on('error', (error) => {
      results.set(name, { status: 'FAIL', scripts, code: null, signal: null, durationMs: Date.now() - started, output: `${output}\n${error.message}`.slice(-maxOutputChars) });
      resolve();
    });
  });
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= stages.length) return;
    const stage = stages[index];
    console.log(`START ${stage[0]} :: ${stage[1].map((script) => `npm run ${script}`).join(' && ')}`);
    await runStage(stage);
    const result = results.get(stage[0]);
    console.log(`${result.status} ${stage[0]} (${result.durationMs}ms)`);
  }
}

await Promise.all(Array.from({ length: Math.min(maxParallel, stages.length) }, worker));

const ordered = stages.map(([name]) => [name, results.get(name)]);
const failed = ordered.filter(([, result]) => result.status !== 'PASS');
console.log('\n=== 20-STAGE RELEASE READINESS ===');
for (const [name, result] of ordered) {
  console.log(`${result.status.padEnd(4)} ${name} :: ${result.scripts.join(' && ')} :: ${result.durationMs}ms`);
}
console.log(`TOTAL=${stages.length} PASS=${stages.length - failed.length} FAIL=${failed.length}`);

if (failed.length) {
  console.error('\nRelease readiness is NOT PROVEN. Failed stages:');
  for (const [name, result] of failed) {
    console.error(`\n--- ${name} / ${result.scripts.join(' && ')} ---\n${result.output}`);
  }
  process.exitCode = 1;
}
