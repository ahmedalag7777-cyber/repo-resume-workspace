import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();

export function validateTrustRuntimePersistence(sql) {
  for(const t of ['is_continuous_trust_healthy','tenant_isolation_canary_runs','billing_liveness_probes','artifact_verification_runs','incident_regression_links','intelligence_safety_adjustments']) if(!sql.includes(t)) throw new Error(`Trust persistence missing: ${t}`);
  if(!/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.is_continuous_trust_healthy\s*\(/i.test(sql)) throw new Error('Trust health function definition missing');
  return true;
}

export function validateTrustRuntimeBridge(runtime, migrationSql) {
  if(!runtime.includes("rpc('autonomy_runtime_gate'")) throw new Error('Runtime autonomy bridge missing: autonomy_runtime_gate');
  if(!/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.autonomy_runtime_gate\s*\(/i.test(migrationSql)) throw new Error('Autonomy SQL bridge function missing: autonomy_runtime_gate');
  if(!/public\.is_continuous_trust_healthy\s*\(/i.test(migrationSql)) throw new Error('Autonomy SQL bridge missing: is_continuous_trust_healthy');
  return true;
}

const files=['supabase/migrations/20260825090000_continuous_trust_autonomous_ops.sql','src/lib/production-intelligence.ts','src/lib/phase-kl-supabase-runtime.ts','scripts/check-continuous-trust-contract.mjs'];
for(const f of files) if(!fs.existsSync(path.join(root,f))) throw new Error(`Missing trust runtime component: ${f}`);
const sql=fs.readFileSync(path.join(root,files[0]),'utf8');
const intelligence=fs.readFileSync(path.join(root,files[1]),'utf8');
const runtime=fs.readFileSync(path.join(root,files[2]),'utf8');
const migrationsDir=path.join(root,'supabase/migrations');
const migrationSql=fs.readdirSync(migrationsDir).filter(f=>f.endsWith('.sql')).sort().map(f=>fs.readFileSync(path.join(migrationsDir,f),'utf8')).join('\n');

validateTrustRuntimePersistence(sql);
validateTrustRuntimeBridge(runtime, migrationSql);
for(const t of ['trustHealthy','criticalDrift','rollbackVerified','isolationVerified']) if(!intelligence.includes(t)) throw new Error(`Decision trust invariant missing: ${t}`);
if(/GRANT\s+ALL\s+TO\s+anon/i.test(sql)) throw new Error('Unsafe anonymous privilege detected');

// Test-of-test: reject stale persistence identifiers, a broken runtime RPC bridge,
// and an SQL autonomy gate that no longer reaches the canonical trust-health function.
const staleIdentifier = sql.replaceAll('incident_regression_links', 'incident_regressions');
assert.throws(() => validateTrustRuntimePersistence(staleIdentifier), /Trust persistence missing: incident_regression_links/);
const weakenedRuntime = runtime.replace("rpc('autonomy_runtime_gate'", "rpc('autonomy_runtime_gate_missing'");
assert.throws(() => validateTrustRuntimeBridge(weakenedRuntime, migrationSql), /Runtime autonomy bridge missing: autonomy_runtime_gate/);
const weakenedSqlBridge = migrationSql.replace(/public\.is_continuous_trust_healthy\s*\(/g, 'public.is_continuous_trust_health_missing(');
assert.throws(() => validateTrustRuntimeBridge(runtime, weakenedSqlBridge), /Autonomy SQL bridge missing: is_continuous_trust_healthy/);

console.log('Continuous trust runtime chain: PASS (canonical persistence + runtime RPC + migration SQL bridge + adversarial stale-identifier/runtime/SQL-bridge test-of-test)');
