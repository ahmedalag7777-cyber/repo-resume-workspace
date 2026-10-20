import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const migration = path.join(root,'supabase/migrations/20260825050000_operational_resilience_trust.sql');
const resilienceRuntime = fs.readFileSync(path.join(root,'src/server/resilience-runtime.mjs'),'utf8');
for (const token of ['NETLIFY_DEPLOY_ID','COMMIT_REF','VERCEL_DEPLOYMENT_ID','VERCEL_GIT_COMMIT_SHA']) {
  if (!resilienceRuntime.includes(token)) throw new Error(`Runtime provenance fallback missing: ${token}`);
}
const failureObservabilityMigration = path.join(root,'supabase/migrations/20260917184216_harden_report_execution_failure_observability_20260917190000.sql');
if (!fs.existsSync(migration)) throw new Error('Operational resilience migration missing');
if (!fs.existsSync(failureObservabilityMigration)) throw new Error('Report execution failure observability migration missing');
const sql = fs.readFileSync(migration,'utf8');
const failureObservabilitySql = fs.readFileSync(failureObservabilityMigration,'utf8');
const required = [
  'operational_health_snapshots','backup_verification_runs','slo_evidence','incident_evidence','trust_certifications',
  'authenticated_operational_health_tenant','authenticated_backup_verification_tenant','authenticated_slo_evidence_tenant',
  'authenticated_incident_evidence_tenant','authenticated_trust_certifications_tenant','REVOKE ALL ON TABLE',
  'is_trust_certificate_valid','expires_at > now()','blocker_count = 0'
];
const missing = required.filter(x => !sql.includes(x));
if (missing.length) throw new Error(`Operational resilience contract blockers:\n${missing.join('\n')}`);
const failureObservabilityRequired = [
  'CREATE OR REPLACE FUNCTION public.fail_report_execution_job',
  'AUTHENTICATED_USER_REQUIRED',
  'TENANT_CONTEXT_MISMATCH',
  'FOR UPDATE',
  'INSERT INTO public.alerts',
  'INSERT INTO public.audit_logs',
  'report_execution_job_dead_letter',
  'correlationId'
];
const missingFailureObservability = failureObservabilityRequired.filter(x => !failureObservabilitySql.includes(x));
if (missingFailureObservability.length) throw new Error(`Report execution failure observability contract blockers:\n${missingFailureObservability.join('\n')}`);
const workerRecoveryMigration = path.join(root,'supabase/migrations/20260921170000_reconcile_expired_worker_recovery_retryable.sql');
if (!fs.existsSync(workerRecoveryMigration)) throw new Error('Expired worker recovery reconciliation migration missing');
const workerRecoverySql = fs.readFileSync(workerRecoveryMigration,'utf8');
for (const token of [
  'recover_expired_report_execution_jobs',
  'worker_lease_expired_retry',
  'worker_attempts_exhausted_after_lease_expiry',
  'FOR UPDATE SKIP LOCKED',
  'REVOKE ALL ON FUNCTION public.recover_expired_report_execution_jobs(uuid, integer)',
  'GRANT EXECUTE ON FUNCTION public.recover_expired_report_execution_jobs(uuid, integer) TO service_role'
]) {
  if (!workerRecoverySql.includes(token)) throw new Error(`Expired worker recovery reconciliation missing: ${token}`);
}

const snapshotProbe = fs.readFileSync(path.join(root,'scripts/phase-f-live-resilience-probes.mjs'),'utf8');
for (const token of ['buildExportedSnapshotSql()', '--snapshot="$SNAPSHOT_ID"', "source_snapshot_strategy: 'postgres-exported-snapshot-shared-with-pg-dump'"]) {
  if (!snapshotProbe.includes(token)) throw new Error('Logical restore snapshot binding missing: ' + token);
}
const snapshotHelper = fs.readFileSync(path.join(root,'src/server/logical-restore-snapshot.mjs'),'utf8');
for (const token of ['SET TRANSACTION SNAPSHOT', 'logical_snapshot_id_invalid', 'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE', 'pg_export_snapshot()']) {
  if (!snapshotHelper.includes(token)) throw new Error('Logical restore snapshot helper missing: ' + token);
}

const roadmap = fs.readFileSync(path.join(root,'docs/IMPLEMENTATION_ROADMAP.md'),'utf8');
for (const item of ['Automated tenant-isolation canary suite','Automated migration dry-run and schema drift detection','Backup freshness/restore verification','Queue health, stuck-worker and dead-letter alerting','Artifact delivery integrity monitoring','SLO dashboards, error budgets and incident evidence ledger','Periodic trust certification']) if (!roadmap.includes(item)) throw new Error(`Roadmap resilience item missing: ${item}`);
console.log('Operational resilience contract: PASS');
console.log('  - existing resilience contract remains intact');
console.log('  - report execution failure/dead-letter alert emission remains source-bound');
console.log('  - report execution failure audit emission remains source-bound');