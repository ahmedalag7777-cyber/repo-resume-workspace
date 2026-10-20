import fs from 'node:fs';

const release = fs.readFileSync('.github/workflows/release-certification.yml', 'utf8');
const boundary = fs.readFileSync('.github/workflows/production-evidence-boundary.yml', 'utf8');
const decision = fs.readFileSync('scripts/production-release-decision.mjs', 'utf8');

const requireToken = (source, token, label) => {
  if (!source.includes(token)) throw new Error(`${label}: missing ${token}`);
};

for (const token of [
  'source_sha',
  'certification_run_id',
  'migrations_fingerprint',
  'dependency_lock_fingerprint',
  'artifact_fingerprint',
  'manifest_id',
  'production-regression-results.json',
  'certification-decision.json',
  'report-advisor-release-evidence-${{ github.sha }}',
]) requireToken(release, token, 'release-certification');

for (const token of [
  'workflow_run:',
  'workflows: [release-certification]',
  "github.event.workflow_run.conclusion == 'success'",
  'actions: read',
  'actions/download-artifact@v4',
  'report-advisor-release-evidence-${{ github.event.workflow_run.head_sha || inputs.source_sha }}',
  'EXPECTED_SOURCE_SHA:',
  'RELEASE_CERTIFICATION_RUN_ID:',
  'RELEASE_EVIDENCE_ARTIFACT_NAME:',
  'RELEASE_EVIDENCE_MANIFEST_PATH:',
  'RELEASE_CERTIFICATION_DECISION_PATH:',
  'consumption-proof.json',
]) requireToken(boundary, token, 'production-evidence-boundary');

for (const token of [
  'Validate exact certification run',
  'gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${RUN_ID}"',
  "workflow_name=\"$(jq -r '.name' <<<\"$run_json\")\"",
  "conclusion=\"$(jq -r '.conclusion' <<<\"$run_json\")\"",
  "head_sha=\"$(jq -r '.head_sha' <<<\"$run_json\")\"",
  '[[ "$workflow_name" == "release-certification" ]]',
  '[[ "$conclusion" == "success" ]]',
  '[[ "$head_sha" == "$EXPECTED_SOURCE_SHA" ]]',
  '[[ "$event" == "workflow_dispatch" || "$event" == "push" ]]',
]) requireToken(boundary, token, 'manual release-certification run validation');

for (const token of [
  'loadProductionRegressionResults',
  'evaluateRelease(results, expectedSha',
  'PRODUCTION_REGRESSION_RESULTS_MISSING',
  'source-sha-mismatch',
  'scenario-count-mismatch',
  'missing-evidence-id',
  'missing-evidence-path',
  'non-pass-status:',
  'status !== TERMINAL_PASS',
]) requireToken(decision, token, 'production-release-decision');

if (/certification_result:\s*'passed'/.test(release)) throw new Error('release-certification contains a static passed result');
if (/blocker_count:\s*0/.test(release)) throw new Error('release-certification contains a static zero blocker count');
if (boundary.includes('push:\n    branches: [main]')) throw new Error('production-evidence-boundary must not consume an unbound push without release evidence');
if (!boundary.includes('if-no-files-found: error')) throw new Error('production consumption proof must fail closed when absent');

console.log('release evidence consumption workflow contract: PASS');
