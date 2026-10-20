import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import rollbackHandler, { deploymentReady } from '../api/rollback-drill.mjs';
import { isTransientPostgresConnectionError, retryTransientPostgresConnection } from '../src/server/resilience-db-retry.mjs';
import { isDisallowedOutboundAddress, isProductionEnv, parseSecureOutboundUrl, secureOutboundFetch, sha256ResponseBody, runtimeIdentity } from '../src/server/resilience-runtime.mjs';

const files = [
  'api/health.mjs',
  'api/tenant-canary.mjs',
  'api/backup-restore-verify.mjs',
  'api/rollback-drill.mjs',
  'src/server/resilience-runtime.mjs',
  'scripts/phase-f-live-resilience-probes.mjs',
];
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
const phaseFProbe = fs.readFileSync('scripts/phase-f-live-resilience-probes.mjs', 'utf8');
const postgresRetrySource = fs.readFileSync('src/server/resilience-db-retry.mjs', 'utf8');
assert.match(phaseFProbe, /create temp table _phase_f_counts\(table_name text, row_count bigint\)/);
assert.match(phaseFProbe, /EXECUTE format\(/);
assert.match(phaseFProbe, /SELECT table_name \|\| '\|' \|\| row_count::text FROM _phase_f_counts/);
assert.match(phaseFProbe, /const governanceHead = process\.env\.GOVERNANCE_HEAD\?\.trim\(\) \|\| exactHead/);
assert.match(phaseFProbe, /governanceHead,/);
assert.match(phaseFProbe, /const volatileExcludeArgs = \[\.\.\.VOLATILE_RESTORE_TABLES\]/);
assert.match(phaseFProbe, /--exclude-table-data=\$\{tableName\}/);
assert.match(phaseFProbe, /--data-only \$\{volatileExcludeArgs\}/, 'logical backup must exclude data from volatile tables that depend on auth.users');
assert.match(phaseFProbe, /'public\.carts'/, 'logical restore must exclude auth-dependent cart rows');
assert.match(phaseFProbe, /'public\.cart_items'/, 'logical restore must exclude child rows referencing excluded carts');
assert.ok(phaseFProbe.includes("const authUserIdsSql ="), 'logical restore must discover missing Auth user IDs');
assert.ok(phaseFProbe.includes("c.confrelid = 'auth.users'::regclass"), 'Auth placeholder discovery must follow actual FK references');
assert.ok(phaseFProbe.includes("INSERT INTO auth.users (id)"), 'restore must insert ID-only user placeholders');
assert.ok(phaseFProbe.includes("ON CONFLICT (id) DO NOTHING"), 'placeholder insert must be rerunnable');
assert.ok(phaseFProbe.includes("SET LOCAL session_replication_role = replica"), 'placeholder insert must not trigger user creation side effects');
assert.ok(phaseFProbe.includes("runDockerPsqlFileRaw(localDbUrl, authUserStubsPath)"), 'placeholders must be applied to the ephemeral restore target');
assert.ok(phaseFProbe.includes("auth_user_stub_mode: 'id-only-ephemeral'"));
const authStubBuilder = phaseFProbe.slice(phaseFProbe.indexOf('function buildAuthUserStubSql(userIds)'), phaseFProbe.indexOf('\nfunction verifyRestoredRecommendationAuthority'));
assert.ok(authStubBuilder.startsWith('function buildAuthUserStubSql(userIds)'), 'ID-only Auth placeholder builder must exist');
for (const forbidden of ['email', 'encrypted_password', 'raw_app_meta_data', 'raw_user_meta_data', 'confirmation_token']) {
  assert.equal(authStubBuilder.includes(forbidden), false, 'restore must not copy Auth credential/PII field: ' + forbidden);
}
assert.match(phaseFProbe, /retryTransientPostgresConnection/);
assert.match(postgresRetrySource, /PHASE_F_TRANSIENT_POSTGRES_RETRY/);
assert.equal(isTransientPostgresConnectionError(new Error('FATAL: Failed to connect to database: authentication did not complete within 15000ms')), true);
assert.equal(isTransientPostgresConnectionError(new Error('ECHECKOUTTIMEOUT unable to check out connection from pool')), true);
assert.equal(isTransientPostgresConnectionError(new Error('ERROR: duplicate key value violates unique constraint')), false);

let transientAttempts = 0;
const retryDelays = [];
const retryEvents = [];
const connected = retryTransientPostgresConnection(() => {
  transientAttempts += 1;
  if (transientAttempts < 3) throw new Error('authentication did not complete within 15000ms');
  return 'connected';
}, {
  label: 'unit-test',
  pause: (milliseconds) => retryDelays.push(milliseconds),
  onRetry: (event) => retryEvents.push(event),
});
assert.equal(connected, 'connected');
assert.equal(transientAttempts, 3);
assert.deepEqual(retryDelays, [1000, 2000]);
assert.equal(retryEvents.length, 2);

let sqlErrorAttempts = 0;
assert.throws(() => retryTransientPostgresConnection(() => {
  sqlErrorAttempts += 1;
  throw new Error('canceling statement due to statement timeout');
}, { pause: () => assert.fail('SQL errors must not be retried') }), /statement timeout/);
assert.equal(sqlErrorAttempts, 1, 'real SQL failures must fail immediately');

let exhaustedAttempts = 0;
assert.throws(() => retryTransientPostgresConnection(() => {
  exhaustedAttempts += 1;
  throw new Error('authentication did not complete within 15000ms');
}, { maxAttempts: 2, pause: () => undefined, onRetry: () => undefined }), /authentication did not complete/);
assert.equal(exhaustedAttempts, 2, 'transient retries must remain strictly bounded');

assert.equal(timingSafeEqual(Buffer.from('resilience-secret'), Buffer.from('resilience-secret')), true);
process.env.RESILIENCE_TARGET_ENV = 'production';
assert.equal(isProductionEnv(), true);
delete process.env.RESILIENCE_TARGET_ENV;
process.env.VERCEL_DEPLOYMENT_ID = 'dpl-test-runtime';
process.env.VERCEL_GIT_COMMIT_SHA = 'sha-test-runtime';
process.env.VERCEL_ENV = 'preview';
process.env.RESILIENCE_TARGET_ENV = 'staging';
assert.deepEqual(runtimeIdentity(), {
  deployment_id: 'dpl-test-runtime',
  deployment_sha: 'sha-test-runtime',
  target_env: 'staging',
  runtime_environment: 'preview',
  provenance_contract_version: '4',
});
for (const key of ['VERCEL_DEPLOYMENT_ID', 'VERCEL_GIT_COMMIT_SHA', 'VERCEL_ENV', 'RESILIENCE_TARGET_ENV']) delete process.env[key];

assert.equal(parseSecureOutboundUrl('https://backup.example.test/artifact').protocol, 'https:');
assert.throws(() => parseSecureOutboundUrl('http://backup.example.test/artifact', 'backup_artifact_url'), /insecure_backup_artifact_url/);
assert.throws(() => parseSecureOutboundUrl('https://user:pass@backup.example.test/artifact', 'backup_artifact_url'), /credentialed_backup_artifact_url/);
assert.throws(() => parseSecureOutboundUrl('not-a-url', 'restore_verifier_url'), /invalid_restore_verifier_url/);
for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1']) {
  assert.equal(isDisallowedOutboundAddress(address), true, `private address must be rejected: ${address}`);
  const host = address.includes(':') ? `[${address}]` : address;
  assert.throws(() => parseSecureOutboundUrl(`https://${host}/`, 'backup_artifact_url'), /private_backup_artifact_url/);
}
assert.equal(isDisallowedOutboundAddress('8.8.8.8'), false);
assert.equal(isDisallowedOutboundAddress('2606:4700:4700::1111'), false);
process.env.RESILIENCE_OUTBOUND_TIMEOUT_MS = '999';
await assert.rejects(() => secureOutboundFetch('https://backup.example.test/artifact', 'backup_artifact_url'), /invalid_resilience_outbound_timeout_ms/);
process.env.RESILIENCE_OUTBOUND_TIMEOUT_MS = '15000';

const streamed = new Response(new Blob(['resilience-', 'streamed-', 'body']));
const streamedDigest = await sha256ResponseBody(streamed);
assert.equal(streamedDigest.bytes, Buffer.byteLength('resilience-streamed-body'));
assert.equal(streamedDigest.sha256.length, 64);

const original = Object.fromEntries([
  'VERCEL_PROJECT_ID', 'VERCEL_TOKEN', 'RESILIENCE_TARGET_ENV', 'RESILIENCE_COMPANY_ID',
  'RESILIENCE_ROLLBACK_DRILL_DOMAIN', 'RESILIENCE_PRODUCTION_DOMAIN',
  'RESILIENCE_ROLLBACK_FROM_DEPLOYMENT', 'RESILIENCE_ROLLBACK_FORWARD_DEPLOYMENT',
  'RESILIENCE_ROLLBACK_VERIFY_URL', 'RESILIENCE_OPERATIONAL_TOKEN', 'RESILIENCE_OUTBOUND_TIMEOUT_MS',
].map((key) => [key, process.env[key]]));
process.env.VERCEL_PROJECT_ID = 'project-good';
process.env.VERCEL_TOKEN = 'test-token';

const responses = new Map([
  ['same-a', { id: 'same-a', projectId: 'project-good', readyState: 'READY' }],
  ['same-b', { id: 'same-b', projectId: 'project-good', readyState: 'READY' }],
  ['foreign', { id: 'foreign', projectId: 'project-other', readyState: 'READY' }],
  ['not-ready', { id: 'not-ready', projectId: 'project-good', readyState: 'BUILDING' }],
  ['api-fail', new Error('network_timeout')],
]);
let aliasCalls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(url);
  if (options.method === 'POST' && parsed.pathname.includes('/aliases')) {
    aliasCalls.push(parsed.pathname);
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  const id = decodeURIComponent(parsed.pathname.split('/').pop());
  const entry = responses.get(id);
  if (entry instanceof Error) throw entry;
  if (!entry) return new Response('not found', { status: 404 });
  return new Response(JSON.stringify(entry), { status: 200, headers: { 'content-type': 'application/json' } });
};

const makeResponse = () => {
  const state = { status: null, body: null };
  return { state, res: {
    status(code) { state.status = code; return this; },
    setHeader() { return this; },
    end(body) { state.body = JSON.parse(body); },
  }};
};

try {
  await assert.doesNotReject(() => deploymentReady('same-a'));
  await assert.doesNotReject(() => deploymentReady('same-b'));
  await assert.rejects(() => deploymentReady('foreign'), /deployment_project_mismatch/);
  await assert.rejects(() => deploymentReady('missing'), /deployment_lookup_failed:404/);
  await assert.rejects(() => deploymentReady('not-ready'), /deployment_not_ready:BUILDING/);
  await assert.rejects(() => deploymentReady('api-fail'), /network_timeout/);
  await assert.rejects(() => deploymentReady(''), /deployment_id_required/);
  await assert.rejects(() => Promise.all([deploymentReady('same-a'), deploymentReady('foreign')]), /deployment_project_mismatch/);
  delete process.env.VERCEL_PROJECT_ID;
  await assert.rejects(() => deploymentReady('same-a'), /vercel_project_id_required/);
  process.env.VERCEL_PROJECT_ID = 'project-good';

  process.env.RESILIENCE_OPERATIONAL_TOKEN = 'test-token';
  process.env.RESILIENCE_TARGET_ENV = 'staging';
  process.env.RESILIENCE_COMPANY_ID = 'company-good';
  process.env.RESILIENCE_ROLLBACK_DRILL_DOMAIN = 'drill.example.test';
  process.env.RESILIENCE_PRODUCTION_DOMAIN = 'production.example.test';
  process.env.RESILIENCE_ROLLBACK_FROM_DEPLOYMENT = 'same-a';
  process.env.RESILIENCE_ROLLBACK_FORWARD_DEPLOYMENT = 'same-a';
  process.env.RESILIENCE_ROLLBACK_VERIFY_URL = 'https://verify.example.test';

  let captured = makeResponse();
  await rollbackHandler({ method: 'POST', headers: { 'x-resilience-token': 'test-token' } }, captured.res);
  assert.equal(captured.state.status, 409);
  assert.equal(captured.state.body.error, 'rollback_deployments_must_differ');
  assert.equal(aliasCalls.length, 0);

  process.env.RESILIENCE_TARGET_ENV = 'production';
  process.env.RESILIENCE_ROLLBACK_FORWARD_DEPLOYMENT = 'same-b';
  captured = makeResponse();
  await rollbackHandler({ method: 'POST', headers: { 'x-resilience-token': 'test-token' } }, captured.res);
  assert.equal(captured.state.status, 409);
  assert.equal(captured.state.body.error, 'production_rollback_drill_forbidden');
  assert.equal(aliasCalls.length, 0);

  process.env.RESILIENCE_TARGET_ENV = 'staging';
  process.env.RESILIENCE_ROLLBACK_DRILL_DOMAIN = 'production.example.test';
  captured = makeResponse();
  await rollbackHandler({ method: 'POST', headers: { 'x-resilience-token': 'test-token' } }, captured.res);
  assert.equal(captured.state.status, 409);
  assert.equal(captured.state.body.error, 'rollback_domain_is_production_domain');
  assert.equal(aliasCalls.length, 0);

  process.env.RESILIENCE_ROLLBACK_DRILL_DOMAIN = 'drill.example.test';
  process.env.RESILIENCE_ROLLBACK_FROM_DEPLOYMENT = 'api-fail';
  process.env.RESILIENCE_ROLLBACK_FORWARD_DEPLOYMENT = 'foreign';
  aliasCalls = [];
  captured = makeResponse();
  await rollbackHandler({ method: 'POST', headers: { 'x-resilience-token': 'test-token' } }, captured.res);
  assert.equal(captured.state.status, 503);
  assert.equal(captured.state.body.status, 'failed');
  assert.equal(aliasCalls.length, 0, 'must not alias an unvalidated forward deployment');
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

console.log(`PASS: resilience syntax + rollback security/adversarial guards (${files.length} files).`);
