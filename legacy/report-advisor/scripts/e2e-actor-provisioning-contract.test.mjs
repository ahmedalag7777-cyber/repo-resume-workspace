import assert from 'node:assert/strict';
import fs from 'node:fs';

const script = fs.readFileSync('scripts/provision-e2e-actors.mjs', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20261002050000_reconcile_e2e_actor_service_role_key_guard.sql', 'utf8');
const workflow = fs.readFileSync('.github/workflows/full-product-browser-e2e.yml', 'utf8');
const reportContextResolver = fs.readFileSync('scripts/resolve-e2e-report-context.mjs', 'utf8');
const browserReportProof = fs.readFileSync('scripts/run-full-product-browser-e2e.mjs', 'utf8');

assert.match(script, /auth\.admin\.createUser/);
assert.match(script, /createActor\(/);
assert.match(script, /provision_e2e_test_membership/);
assert.doesNotMatch(script, /\.from\(['"]company_memberships['"]\)[\s\S]{0,300}\.insert\(/);
assert.doesNotMatch(script, /\.from\(['"]company_memberships['"]\)[\s\S]{0,300}\.update\(/);
assert.match(script, /tagged =/);
assert.match(script, /actorCredentials\(/);
assert.match(script, /persistActorCredentials\(/);
assert.doesNotMatch(script, /E2E_EXISTING_USER_NOT_TAGGED/);
assert.match(script, /ensureApproverCredentials/);
assert.match(script, /E2E_ACTOR_MODE === 'ephemeral-run-scoped'/);
assert.match(script, /AUTH_RETRY_ATTEMPTS\s*=\s*4/);
assert.match(script, /isAuthRequest\(input\)/);
assert.match(script, /authRetryable/);
assert.match(script, /freshRunScoped/);
assert.match(script, /TEST_USER_A_EPHEMERAL/);
assert.match(script, /TEST_USER_B_EPHEMERAL/);
assert.match(workflow, /TEST_USER_A_EPHEMERAL=false/);
assert.match(workflow, /TEST_USER_B_EPHEMERAL=false/);
assert.match(script, /GITHUB_RUN_ID/);
assert.match(script, /GITHUB_ENV/);

assert.match(migration, /security definer/i);
assert.match(migration, /set search_path = public, pg_catalog/i);
assert.doesNotMatch(migration, /current_setting\(['"]request\.jwt\.claim\.role/);
assert.doesNotMatch(migration, /current_setting\(['"]request\.jwt\.claims/);
assert.match(migration, /revoke all on function public\.provision_e2e_test_membership/i);
assert.match(migration, /grant execute on function public\.provision_e2e_test_membership/i);
assert.match(migration, /e2e_actor/);
assert.match(migration, /e2e_actor_membership_provisioned/);

assert.match(workflow, /Start exact Netlify preview with serverless API/);
assert.ok(workflow.includes('node scripts/provision-e2e-actors.mjs'));
const previewStep = workflow.indexOf('Start exact Netlify preview with serverless API');
const provisionStep = workflow.indexOf('node scripts/provision-e2e-actors.mjs', previewStep);
assert.ok(previewStep >= 0 && provisionStep > previewStep);
assert.ok(/REPORT_ADVISOR_SUPABASE_URL:\s*\$\{\{\s*secrets\.REPORT_ADVISOR_SUPABASE_URL\s*\}\}|REPORT_ADVISOR_SUPABASE_URL:\s*https:\/\/fnqbvfuwbdpwvhcgzksl\.supabase\.co/.test(workflow), 'REPORT_ADVISOR_SUPABASE_URL contract missing canonical or secret endpoint');
assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
assert.match(workflow, /Prepare rerunnable E2E actor credentials/);


assert.match(workflow, /Resolve dynamic source-bound report context/);
assert.match(workflow, /id: resolve-report-context/);
assert.match(workflow, /node scripts\/resolve-e2e-report-context\.mjs/);
assert.match(workflow, /steps\.resolve-report-context\.outputs\.ready == 'true'/);
assert.match(reportContextResolver, /AbortSignal\.timeout\(timeoutMs\)/);
assert.match(reportContextResolver, /rpc\/get_report_value_cohort_candidates/);
assert.match(reportContextResolver, /isSyntheticRecord/);
assert.match(reportContextResolver, /legacyHash/);
assert.match(reportContextResolver, /REAL_SMART_REPORT_SOURCE_HASH/);
assert.match(reportContextResolver, /CURRENT_REPORT_SOURCE_PATH/);
assert.match(reportContextResolver, /ready=true/);

assert.match(browserReportProof, /realReportSourcePresent:\s*text\.includes\(smartReportSourcePath\)/);
assert.doesNotMatch(browserReportProof, /realReportSourcePresent:\s*text\.includes\(REAL_SMART_REPORT_SOURCE_PATH\)/);

assert.doesNotMatch(workflow, /OPEN_REPORT_EXECUTION_JOB_ID:\s*['"]16709d80-e012-40ef-9c12-6fd8255897f8['"]/);
assert.doesNotMatch(workflow, /OPEN_REPORT_EXPECTED_SOURCE_HASH:\s*['"]sha256:587f2d3dbdc7ec1ccc8c988ccad72f84b6cf2b794fcbce6711ffe5ecf9d6b313['"]/);
assert.doesNotMatch(workflow, /CURRENT_REPORT_SOURCE_PATH:\s*'تقارير ادارية\.xlsx'/);
assert.doesNotMatch(workflow, /CURRENT_REPORT_SOURCE_HASH:\s*'sha256:587f2d3dbdc7ec1ccc8c988ccad72f84b6cf2b794fcbce6711ffe5ecf9d6b313'/);

console.log('E2E_ACTOR_PROVISIONING_CONTRACT_PASS');
