import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { scenarios } from './production-scenario-matrix.mjs';

const outputDir = path.resolve('release-evidence/scenarios');
const outputPath = path.resolve('release-evidence/production-regression-results.json');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/i.test(sourceSha)) throw new Error(`INVALID_SOURCE_SHA:${sourceSha}`);

const stageSequence = ['detect', 'map', 'normalize', 'analyze', 'reconcile', 'evidence', 'decision', 'quality'];

// Each scenario is backed by existing executable regression suites. No fixture, JWT,
// database row, or PASS marker is synthesized here. A command that exits non-zero
// makes its scenario non-PASS and blocks release certification.
const harnesses = {
  'excel-standard': ['npm:test:canonical-import-mapping', 'npm:test:file-engine-contract'],
  'excel-aliases': ['npm:test:import-classifier-regressions', 'npm:test:business-key-regressions'],
  'excel-missing-columns': ['npm:test:data-quality-projections', 'npm:test:quality-workflow-contract'],
  'csv-reordered': ['npm:test:schema-intelligence', 'npm:test:schema-entity-reconciliation'],
  'pdf-text': ['npm:test:file-engine-regressions', 'npm:test:document-intelligence-semantic-foundation'],
  'pdf-ocr-ar': ['npm:test:document-intelligence-hardening', 'npm:test:document-intelligence-decision-gate'],
  'unknown-report': ['npm:test:schema-intelligence', 'npm:test:document-intelligence-contract'],
  'exchange-statement': ['npm:test:report-truth', 'node:scripts/business-golden-corpus-contract.mjs'],
  'multi-currency': ['npm:test:safe-metrics', 'npm:test:consolidated-intelligence'],
  'duplicate-transactions': ['npm:test:incremental-import-ledger', 'npm:test:import-business-key'],
  'large-file': ['npm:test:production-scale', 'npm:build', 'npm:perf:budget'],
  'corrupt-data': ['npm:test:file-intelligence-security', 'npm:test:document-resilience'],
};

const commandCache = new Map();

function runCommand(key) {
  if (commandCache.has(key)) return commandCache.get(key);

  let result;
  const startedAt = new Date().toISOString();
  const started = Date.now();
  if (key.startsWith('npm:')) {
    const script = key.slice(4);
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    result = spawnSync(npmCommand, ['run', script], { encoding: 'utf8', shell: process.platform === 'win32' });
  } else if (key.startsWith('node:')) {
    const args = key.slice(5).trim().split(/\s+/);
    result = spawnSync('node', args, { encoding: 'utf8' });
  } else {
    result = { status: 1, stdout: '', stderr: `UNSUPPORTED_HARNESS_COMMAND:${key}` };
  }

  const record = {
    command: key,
    started_at: startedAt,
    duration_ms: Date.now() - started,
    exit_code: typeof result.status === 'number' ? result.status : 1,
    signal: result.signal ?? null,
    spawn_error: result.error ? String(result.error) : null,
    stdout: String(result.stdout ?? '').slice(-12000),
    stderr: String(result.stderr ?? '').slice(-12000),
  };
  commandCache.set(key, record);
  return record;
}

fs.mkdirSync(outputDir, { recursive: true });
const results = {};

for (const scenario of scenarios) {
  const declaredHarness = harnesses[scenario.id];
  const startedAt = new Date().toISOString();
  const commandResults = Array.isArray(declaredHarness) ? declaredHarness.map(runCommand) : [];
  const harnessPresent = Array.isArray(declaredHarness) && declaredHarness.length > 0;
  const passed = harnessPresent && commandResults.every((command) => command.exit_code === 0);
  const failures = commandResults.filter((command) => command.exit_code !== 0).map((command) => ({
    command: command.command,
    exit_code: command.exit_code,
    signal: command.signal,
    spawn_error: command.spawn_error,
  }));

  const evidencePayload = {
    schema_version: 1,
    evidence_kind: 'executable-regression-harness',
    exact_sha: sourceSha,
    scenario_id: scenario.id,
    scenario_expected: scenario.expect,
    stage_sequence: stageSequence,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    harness: commandResults,
    harness_declared: harnessPresent,
    result: passed ? 'PASS' : 'BLOCKED',
    failures,
    note: 'Regression evidence is executable CI evidence, not a claim of production-live data execution.',
  };
  const evidenceId = crypto.createHash('sha256').update(JSON.stringify(evidencePayload)).digest('hex');
  evidencePayload.evidence_id = evidenceId;

  const evidenceRelativePath = `release-evidence/scenarios/${scenario.id}.json`;
  fs.writeFileSync(path.resolve(evidenceRelativePath), JSON.stringify(evidencePayload, null, 2) + '\n');

  results[scenario.id] = {
    status: passed ? 'PASS' : 'BLOCKED',
    exact_sha: sourceSha,
    evidence_id: evidenceId,
    evidence_path: evidenceRelativePath,
    expected: scenario.expect,
    stages: stageSequence,
    harness_commands: declaredHarness ?? [],
    failures,
  };
}

const payload = {
  schema_version: 1,
  source_sha: sourceSha,
  generated_at: new Date().toISOString(),
  scenario_count: scenarios.length,
  scenarios: results,
};

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');

const failed = Object.entries(results).filter(([, result]) => result.status !== 'PASS');
console.log(`Production regression evidence: ${scenarios.length - failed.length}/${scenarios.length} scenarios PASS on ${sourceSha}.`);
if (failed.length) {
  for (const [scenarioId, result] of failed) {
    console.error(`BLOCKED ${result.exact_sha} ${result.evidence_path}: ${result.failures.map((failure) => `${failure.command} (exit ${failure.exit_code}${failure.signal ? `, signal ${failure.signal}` : ''}${failure.spawn_error ? `, spawn_error ${failure.spawn_error}` : ''})`).join(', ') || 'missing harness'}`);
    const evidence = JSON.parse(fs.readFileSync(path.resolve(result.evidence_path), 'utf8'));
    for (const command of evidence.harness ?? []) {
      if (command.exit_code !== 0) {
        console.error(`--- ${scenarioId} :: ${command.command} :: exit ${command.exit_code} ---`);
        if (command.spawn_error) console.error(`spawn_error:\n${command.spawn_error}`);
        if (command.stdout) console.error(`stdout:\n${command.stdout}`);
        if (command.stderr) console.error(`stderr:\n${command.stderr}`);
      }
    }
  }
  process.exit(1);
}
