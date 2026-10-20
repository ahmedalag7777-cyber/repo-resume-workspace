import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260908210000_reconcile_report_execution_worker_contract_current_main.sql', 'utf8');
const adapter = fs.readFileSync('src/lib/report-execution/durable-worker-adapter.ts', 'utf8');
const runner = fs.readFileSync('src/lib/report-execution/durable-production-runner.ts', 'utf8');

for (const signature of [
  'claim_report_execution_job(p_job_id uuid,p_company_id uuid,p_lease_owner text,p_lease_seconds integer default 300)',
  'heartbeat_report_execution_job(p_job_id uuid,p_company_id uuid,p_worker_id text,p_lease_token uuid,p_lease_seconds integer default 300)',
  'advance_report_execution_checkpoint(p_job_id uuid,p_company_id uuid,p_worker_id text,p_lease_token uuid,p_checkpoint jsonb)',
  'complete_report_execution_job(p_job_id uuid,p_company_id uuid,p_worker_id text,p_lease_token uuid,p_evidence jsonb default',
  'fail_report_execution_job(p_job_id uuid,p_company_id uuid,p_worker_id text,p_lease_token uuid,p_error jsonb)',
  'recover_expired_report_execution_jobs(p_company_id uuid,p_limit integer default 100)',
  'retry_report_execution_job(p_job_id uuid,p_company_id uuid)',
]) assert.ok(migration.includes(signature), `missing worker signature: ${signature}`);

for (const rpc of ['claim_report_execution_job','heartbeat_report_execution_job','advance_report_execution_checkpoint','complete_report_execution_job','fail_report_execution_job','retry_report_execution_job']) {
  assert.ok(adapter.includes(`rpc('${rpc}'`), `adapter missing ${rpc}`);
}

assert.match(adapter, /leaseToken: string \| null/);
assert.match(adapter, /p_company_id: tenantId/);
assert.match(adapter, /p_lease_token: job\.leaseToken/);
assert.match(runner, /const tenantId = input\.request\.tenantId/);
assert.match(runner, /store\.claim\(input\.jobId, input\.workerId, leaseSeconds, tenantId\)/);
assert.match(runner, /store\.heartbeat\(input\.jobId, input\.workerId, leaseSeconds, tenantId\)/);
assert.match(runner, /store\.saveCheckpoint\(input\.jobId, checkpoint\(following\), input\.workerId, tenantId\)/);
assert.match(runner, /store\.retry\(input\.jobId, tenantId\)/);

for (const fn of ['enqueue_report_execution_job','claim_report_execution_job','heartbeat_report_execution_job','advance_report_execution_checkpoint','complete_report_execution_job','fail_report_execution_job','recover_expired_report_execution_jobs','retry_report_execution_job']) {
  assert.match(migration, new RegExp(`grant execute on function public\\.${fn}`), `missing service_role grant for ${fn}`);
  assert.doesNotMatch(migration, new RegExp(`grant execute on function public\\.${fn}[^\\n]*to authenticated`, 'i'), `worker RPC must not grant authenticated EXECUTE: ${fn}`);
}

assert.equal((migration.match(/set search_path to 'pg_catalog'/g) ?? []).length, 8, 'all eight worker SECURITY DEFINER RPCs must pin search_path');
assert.match(migration, /alter table public\.report_execution_jobs enable row level security/);
assert.match(migration, /using \(company_id = public\.current_company_id\(\)\)/);
assert.match(migration, /with check \(company_id = public\.current_company_id\(\)\)/);
assert.match(migration, /lease_token is not null/);
assert.match(migration, /source_path set not null/);
assert.match(migration, /source_hash set not null/);
assert.match(migration, /max_attempts set not null/);
assert.match(migration, /worker_attempts_exhausted_after_lease_expiry/);
assert.match(migration, /drop function if exists public\.retry_report_execution_job\(uuid\)/);

console.log('Report execution worker current-main contract: PASS');
