import { spawn } from 'node:child_process';

const families = [
  ['folder-watch', 'npm', ['run', 'test:folder-watch-platform-contract']],
  ['watched-pipeline', 'npm', ['run', 'test:watched-report-pipeline']],
  ['document-contracts', 'npm', ['run', 'test:document-intelligence-contract']],
  ['document-hardening', 'npm', ['run', 'test:document-intelligence-hardening']],
  ['document-decision-gate', 'npm', ['run', 'test:document-intelligence-decision-gate']],
  ['file-intelligence-security', 'npm', ['run', 'test:file-intelligence-security']],
  ['decision-intelligence', 'npm', ['run', 'test:decision-intelligence-closure']],
  ['production-coordinator', 'npm', ['run', 'test:production-coordinator-integration']],
];

const results = await Promise.all(families.map(([name, command, args]) => new Promise((resolve) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; process.stdout.write(`[${name}] ${chunk}`); });
  child.stderr.on('data', (chunk) => { output += chunk; process.stderr.write(`[${name}] ${chunk}`); });
  child.on('error', (error) => resolve({ name, status: 1, output: `${output}\n${error.message}` }));
  child.on('close', (status) => resolve({ name, status: status ?? 1, output }));
})));

const failed = results.filter((result) => result.status !== 0);
console.log(`P1 family gate: ${families.length - failed.length}/${families.length} PASS; ${failed.length} FAIL`);
if (failed.length) {
  console.error('Failing families:');
  for (const result of failed) console.error(`- ${result.name} (exit=${result.status})`);
  process.exit(1);
}
