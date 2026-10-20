import fs from 'node:fs';

const files = [
  'scripts/golden-e2e-corpus.test.mjs',
  'scripts/check-report-execution-e2e-contract.mjs',
  'scripts/check-production-scale.mjs',
  'scripts/check-performance-budget.mjs',
  'scripts/check-production-release-blockers.mjs',
];
for (const file of files) {
  if (!fs.existsSync(file)) throw new Error(`Missing Phase 11 evidence surface: ${file}`);
}

const read = (file) => fs.readFileSync(file, 'utf8');
const sources = Object.fromEntries(files.map((file) => [file, read(file)]));
const stripJsComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
const must = (condition, message) => {
  if (!condition) throw new Error(`PHASE11_E2E_PERFORMANCE_CLOSURE_FAIL: ${message}`);
};

const executable = Object.fromEntries(
  Object.entries(sources).map(([file, source]) => [file, stripJsComments(source)]),
);
const e2e = executable[files[0]] + '\n' + executable[files[1]];
const scale = executable[files[2]];
const perf = executable[files[3]];
const blockers = executable[files[4]];

const assertClosure = (contractE2E, contractScale, contractPerf, contractBlockers) => {
  for (const token of ['tenantId', 'sourceSnapshotId', 'idempotencyKey', 'ReportExecutionEvidence']) {
    must(contractE2E.includes(token), `E2E evidence contract missing ${token}`);
  }
  for (const token of ['golden', 'deterministic', 'expected', 'corpus']) {
    must(executable[files[0]].toLowerCase().includes(token), `golden E2E corpus missing ${token}`);
  }
  for (const token of ['250000', 'chunking', 'streaming-count']) {
    must(contractScale.toLowerCase().includes(token.toLowerCase()), `scale contract missing ${token}`);
  }
  const criticalLimit = contractPerf.match(/const\s+MAX_CRITICAL_KB\s*=\s*(\d+)/)?.[1];
  const chunkLimit = contractPerf.match(/const\s+MAX_CHUNK_KB\s*=\s*(\d+)/)?.[1];
  must(criticalLimit === '950', `performance budget critical limit drifted: expected 950KB, got ${criticalLimit ?? 'missing'}`);
  must(chunkLimit === '600', `performance budget chunk limit drifted: expected 600KB, got ${chunkLimit ?? 'missing'}`);
  must(contractPerf.includes('largest JS chunk'), 'performance budget must measure largest JS chunk');
  must(contractE2E.toLowerCase().includes('fail-closed'), 'E2E contract must preserve fail-closed negative paths');
  must(contractBlockers.toLowerCase().includes('idempotencykey'), 'release blockers must preserve idempotency coverage');
};

assertClosure(e2e, scale, perf, blockers);

const tamperedE2E = e2e
  .replaceAll('tenantId', '')
  .replaceAll('ReportExecutionEvidence', '');
let tamperedRejected = false;
try {
  assertClosure(tamperedE2E, scale, perf, blockers);
} catch {
  tamperedRejected = true;
}
must(tamperedRejected, 'tampered E2E evidence still satisfied the closure contract');

const tamperedPerf = perf.replace('const MAX_CHUNK_KB = 600;', 'const MAX_CHUNK_KB = 500;');
let tamperedPerfRejected = false;
try {
  assertClosure(e2e, scale, tamperedPerf, blockers);
} catch {
  tamperedPerfRejected = true;
}
must(tamperedPerfRejected, 'tampered performance limit still satisfied the closure contract');

const commentDecoy = `// tenantId\n// ReportExecutionEvidence`;
const executableDecoy = stripJsComments(commentDecoy);
must(!executableDecoy.includes('tenantId'), 'comment-only tenant marker was accepted');
must(!executableDecoy.includes('ReportExecutionEvidence'), 'comment-only evidence marker was accepted');

console.log('PHASE11_E2E_PERFORMANCE_CLOSURE_PASS (golden E2E, negative-path, scale, performance, release-blocker, and adversarial checks)');
