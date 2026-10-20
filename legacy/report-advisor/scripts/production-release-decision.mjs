import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { baseline, compareScenarioResult } from './production-regression-baseline.mjs';

const TERMINAL_PASS = 'PASS';
const FORBIDDEN_STATUS = new Set(['FIXED', 'IN_PROGRESS', 'QUEUED', 'SKIPPED']);

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function fail(reason, details = {}) {
  return {
    release: 'blocked',
    reason,
    failures: [{ id: '__release__', reason, ...details }],
    scenarioCount: Object.keys(baseline).length,
    passedScenarioCount: 0,
  };
}

function normalizeResults(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.scenarios && typeof payload.scenarios === 'object' && !Array.isArray(payload.scenarios)) return payload;
  return { scenarios: payload };
}

function validateEvidenceArtifact(result, payload, resultsResolvedPath) {
  const evidencePath = path.resolve(path.dirname(resultsResolvedPath), '..', result.evidence_path);
  if (!fs.existsSync(evidencePath)) return { ok: false, reason: 'evidence-file-missing' };
  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch (error) {
    return { ok: false, reason: 'evidence-file-invalid-json', details: { error: String(error) } };
  }
  if (evidence.exact_sha !== payload.source_sha) return { ok: false, reason: 'evidence-source-sha-mismatch', details: { expected: payload.source_sha, actual: evidence.exact_sha ?? null } };
  if (evidence.scenario_id !== result.scenario_id) return { ok: false, reason: 'evidence-scenario-mismatch', details: { expected: result.scenario_id, actual: evidence.scenario_id ?? null } };
  if (evidence.evidence_id !== result.evidence_id) return { ok: false, reason: 'evidence-id-mismatch', details: { expected: result.evidence_id, actual: evidence.evidence_id ?? null } };
  const { evidence_id: _storedEvidenceId, ...contentForHash } = evidence;
  const recomputedEvidenceId = crypto.createHash('sha256').update(JSON.stringify(contentForHash)).digest('hex');
  if (recomputedEvidenceId !== evidence.evidence_id) return { ok: false, reason: 'evidence-id-integrity-mismatch', details: { expected: recomputedEvidenceId, actual: evidence.evidence_id } };
  if (evidence.result !== result.status) return { ok: false, reason: 'evidence-result-mismatch', details: { expected: result.status, actual: evidence.result ?? null } };
  return { ok: true };
}

export function evaluateRelease(results, expectedSha = null, resultsResolvedPath = path.resolve('release-evidence/production-regression-results.json')) {
  const payload = normalizeResults(results);
  if (!payload) return fail('missing-results-object');
  if (typeof payload.source_sha !== 'string' || !/^[0-9a-f]{40}$/i.test(payload.source_sha)) {
    return fail('missing-or-invalid-source-sha');
  }
  if (expectedSha && payload.source_sha !== expectedSha) {
    return fail('source-sha-mismatch', { expectedSha, actualSha: payload.source_sha });
  }

  const scenarioIds = Object.keys(baseline);
  const actualIds = Object.keys(payload.scenarios || {});
  const failures = [];

  if (actualIds.length !== scenarioIds.length) {
    failures.push({ id: '__release__', reason: 'scenario-count-mismatch', expected: scenarioIds.length, actual: actualIds.length });
  }

  for (const id of scenarioIds) {
    const result = payload.scenarios?.[id];
    if (!result) {
      failures.push({ id, reason: 'missing-result' });
      continue;
    }
    const status = result.status;
    if (status !== TERMINAL_PASS) {
      failures.push({ id, reason: FORBIDDEN_STATUS.has(status) ? `non-pass-status:${status}` : 'scenario-not-passed', status });
      continue;
    }
    if (result.scenario_id && result.scenario_id !== id) {
      failures.push({ id, reason: 'scenario-id-mismatch', actual: result.scenario_id });
      continue;
    }
    result.scenario_id = id;
    if (result.exact_sha !== payload.source_sha) {
      failures.push({ id, reason: 'scenario-source-sha-mismatch', expected: payload.source_sha, actual: result.exact_sha ?? null });
      continue;
    }
    if (typeof result.evidence_id !== 'string' || result.evidence_id.length < 1) {
      failures.push({ id, reason: 'missing-evidence-id' });
      continue;
    }
    if (typeof result.evidence_path !== 'string' || result.evidence_path.length < 1) {
      failures.push({ id, reason: 'missing-evidence-path' });
      continue;
    }
    const evidenceCheck = validateEvidenceArtifact(result, payload, resultsResolvedPath);
    if (!evidenceCheck.ok) {
      failures.push({ id, reason: evidenceCheck.reason, ...(evidenceCheck.details || {}) });
      continue;
    }
    const check = compareScenarioResult(id, result);
    if (!check.ok) failures.push({ id, reason: check.reason || 'regression' });
  }

  const unknownIds = actualIds.filter(id => !Object.prototype.hasOwnProperty.call(baseline, id));
  for (const id of unknownIds) failures.push({ id, reason: 'unknown-scenario' });

  return {
    release: failures.length === 0 ? 'approved' : 'blocked',
    failures,
    scenarioCount: scenarioIds.length,
    passedScenarioCount: scenarioIds.length - failures.filter((f) => scenarioIds.includes(f.id)).length,
    source_sha: payload.source_sha,
  };
}

export function loadProductionRegressionResults(resultsPath) {
  const resolved = path.resolve(resultsPath);
  if (!fs.existsSync(resolved)) throw new Error(`PRODUCTION_REGRESSION_RESULTS_MISSING:${resultsPath}`);
  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return { payload, resolved };
}

export function writeDecision(outputPath, decision) {
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(decision, null, 2) + '\n');
}

if (process.argv[1]?.endsWith('production-release-decision.mjs')) {
  const resultsPath = arg('--results', 'release-evidence/production-regression-results.json');
  const expectedSha = arg('--sha', process.env.EXPECTED_SOURCE_SHA || null);
  const outputPath = arg('--output', 'release-evidence/certification-decision.json');
  const { payload, resolved } = loadProductionRegressionResults(resultsPath);
  const decision = evaluateRelease(payload, expectedSha, resolved);
  decision.results_path = resolved;
  decision.decided_at = new Date().toISOString();
  writeDecision(outputPath, decision);
  console.log(JSON.stringify(decision, null, 2));
  if (decision.release !== 'approved') process.exit(1);
}
