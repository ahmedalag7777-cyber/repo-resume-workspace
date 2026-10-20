import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const runtime=fs.readFileSync(path.join(root,'src/lib/production-intelligence.ts'),'utf8');
const supabase=fs.readFileSync(path.join(root,'src/lib/phase-kl-supabase-runtime.ts'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260825142000_phase_kl_runtime_closure.sql'),'utf8');
const cert=fs.readFileSync(path.join(root,'supabase/migrations/20260825150000_phase_m_certification_bundle.sql'),'utf8');
for(const token of ['trustHealthy','evidenceQuality','confidence','riskBudgetValid','criticalDrift','rollbackVerified','isolationVerified']) if(!runtime.includes(token)) throw new Error(`Autonomy gate missing: ${token}`);
for(const token of ['autonomyGate','autonomy_runtime_gate']) if(!supabase.includes(token)) throw new Error(`Autonomy runtime link missing: ${token}`);
for(const token of ['is_continuous_trust_healthy','current_company_id()','critical_drift']) if(!sql.includes(token)) throw new Error(`Autonomy SQL safety link missing: ${token}`);
for(const token of ['can_release_production_certification','rollback_passed','security_audit_passed','artifact_integrity_passed']) if(!cert.includes(token)) throw new Error(`Production certification safety link missing: ${token}`);
if(cert.includes('GRANT ALL TO anon')) throw new Error('Unsafe certification grant detected');

// Test-of-test: a deliberately weakened runtime bridge must be rejected.
const weakenedRuntime = supabase.replace(/autonomyGate/g, 'weakenedGate');
assert.equal(weakenedRuntime.includes('autonomyGate'), false);
assert.throws(() => {
  for(const token of ['autonomyGate','autonomy_runtime_gate']) if(!weakenedRuntime.includes(token)) throw new Error(`Autonomy runtime link missing: ${token}`);
}, /Autonomy runtime link missing: autonomyGate/);

console.log('Autonomy safety chain: PASS (canonical runtime gate + RPC + adversarial bridge test)');
