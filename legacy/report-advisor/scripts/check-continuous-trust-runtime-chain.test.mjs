import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { validateTrustRuntimePersistence, validateTrustRuntimeBridge } from './check-continuous-trust-runtime-chain.mjs';

const sql = fs.readFileSync('supabase/migrations/20260825090000_continuous_trust_autonomous_ops.sql', 'utf8');
const runtime = fs.readFileSync('src/lib/phase-kl-supabase-runtime.ts', 'utf8');
const migrationSql = fs.readdirSync(path.join('supabase','migrations')).filter(f => f.endsWith('.sql')).sort().map(f => fs.readFileSync(path.join('supabase','migrations',f), 'utf8')).join('\n');
assert.doesNotThrow(() => validateTrustRuntimePersistence(sql));
assert.doesNotThrow(() => validateTrustRuntimeBridge(runtime, migrationSql));

const weakenedPersistence = sql.replaceAll('tenant_isolation_canary_runs', 'tenant_isolation_canary_missing');
assert.throws(() => validateTrustRuntimePersistence(weakenedPersistence), /Trust persistence missing/);

const weakenedBridge = runtime.replace("rpc('autonomy_runtime_gate'", "rpc('autonomy_runtime_gate_missing'");
assert.throws(() => validateTrustRuntimeBridge(weakenedBridge, migrationSql), /Runtime autonomy bridge missing/);

const weakenedSqlBridge = migrationSql.replace(/public\.is_continuous_trust_healthy\s*\(/g, 'public.is_continuous_trust_missing(');
assert.throws(() => validateTrustRuntimeBridge(runtime, weakenedSqlBridge), /Autonomy SQL bridge missing/);

console.log('Continuous trust runtime-chain test-of-test: PASS (canonical persistence and migration-lineage SQL/RPC bridge accepted; weakened persistence, runtime bridge, and SQL bridge rejected).');
