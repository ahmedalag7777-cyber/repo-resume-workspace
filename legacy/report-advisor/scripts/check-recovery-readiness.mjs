import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
 'scripts/phase-f-live-resilience-probes.mjs',
 'scripts/check-operational-resilience-contract.mjs',
 'scripts/check-release-resilience-manifest.mjs',
 'scripts/check-continuous-trust-contract.mjs',
 'scripts/check-phase-f-runtime-closure.mjs',
 '.github/workflows/phase-f-live-resilience.yml',
 'supabase/migrations/20260825050000_operational_resilience_trust.sql'
];
const missing=required.filter(f=>!fs.existsSync(path.join(root,f)));
if(missing.length) throw new Error(`RECOVERY READINESS BLOCKED:\n${missing.join('\n')}`);
const probe=fs.readFileSync(path.join(root,'scripts/phase-f-live-resilience-probes.mjs'),'utf8');
for(const token of ['RESILIENCE_BACKUP_VERIFY_URL','RESILIENCE_ROLLBACK_DRILL_URL','FAIL-CLOSED']) if(!probe.includes(token)) throw new Error(`Recovery live invariant missing: ${token}`);
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260825050000_operational_resilience_trust.sql'),'utf8');
for(const token of ['backup_verification_runs','incident_evidence','trust_certifications','ENABLE ROW LEVEL SECURITY']) if(!migration.includes(token)) throw new Error(`Recovery evidence invariant missing: ${token}`);
console.log('RECOVERY READINESS CONTRACT: PASS (static; live certification requires Phase F secrets/probes)');
