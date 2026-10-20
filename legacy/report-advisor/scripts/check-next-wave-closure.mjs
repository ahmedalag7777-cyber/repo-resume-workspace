import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
 ['runtime','scripts/check-runtime-closure-integrity.mjs'],
 ['live gates','scripts/check-live-gate-manifest-integrity.mjs'],
 ['autonomy','scripts/check-autonomy-safety-chain.mjs'],
 ['global safety','scripts/check-final-safety-invariants.mjs'],
 ['checkpoint hardening','scripts/report-execution-checkpoint-hardening.test.ts'],
 ['K-S closure','scripts/check-k-to-s-deep-closure.mjs'],
];
for(const [name,file] of required) if(!fs.existsSync(path.join(root,file))) throw new Error(`Next-wave ${name} gate missing: ${file}`);
const checkpoint=fs.readFileSync(path.join(root,'src/lib/report-execution/checkpoint.ts'),'utf8');
for(const token of ['assertValidTransition','createInitialCheckpoint','resumeFromCheckpoint']) if(!checkpoint.includes(token)) throw new Error(`Checkpoint hardening missing: ${token}`);
const ks=fs.readFileSync(path.join(root,'src/lib/k-to-s-runtime.ts'),'utf8');
for(const token of ['item.priority','item.materiality','item.risk','assertNoCrossTenantEvidence']) if(!ks.includes(token)) throw new Error(`K-S canonical field alignment missing: ${token}`);
const migration=fs.readdirSync(path.join(root,'supabase/migrations')).find(x=>x.includes('runtime_lease_hardening'));
if(!migration) throw new Error('Runtime lease hardening migration missing');
const sql=fs.readFileSync(path.join(root,'supabase/migrations',migration),'utf8');
for(const token of ['lease_expires_at > now()','current_company_id()','REVOKE ALL ON FUNCTION','dead_letter']) if(!sql.includes(token)) throw new Error(`Lease safety invariant missing: ${token}`);
console.log('Next-wave closure: PASS');
