import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const gates=[
 'check-master-requirements-contract.mjs','check-selective-foundation-integrity.mjs','check-file-engine-contract.mjs',
 'check-file-engine-regressions.ts','check-business-key-regressions.mjs','check-import-classifier-regressions.mjs',
 'check-import-transaction-contract.mjs','check-import-runtime-governance.mjs','check-tenant-security-contract.mjs',
 'check-production-readiness.mjs','check-production-release-blockers.mjs','check-j-runtime-chain.mjs',
 'check-k-l-execution-evidence-chain.mjs','check-resumability-deadletter-contract.mjs','check-continuous-trust-runtime-chain.mjs',
 'check-governance-runtime-chain.mjs','check-evidence-provenance-chain.mjs','check-production-certification-chain.mjs',
 'check-autonomy-safety-chain.mjs','check-final-safety-invariants.mjs'
];
const missing=gates.filter(f=>!fs.existsSync(path.join(root,'scripts',f))); if(missing.length) throw new Error(`Master gate files missing:\n${missing.join('\n')}`);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const required=['typecheck','build','test:production-scale','test:production-release-blockers','test:production-certification-contract','test:phase-k-runtime','test:phase-l-runtime','test:phase-l-resumable-execution'];
for(const s of required) if(!pkg.scripts?.[s]) throw new Error(`Master package gate missing: ${s}`);
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql')).map(x=>fs.readFileSync(path.join(root,'supabase/migrations',x),'utf8')).join('\n');
for(const token of ['current_company_id()','ENABLE ROW LEVEL SECURITY','is_continuous_trust_healthy','rollback','backup_restore']) if(!migrations.includes(token)) throw new Error(`Master safety invariant missing: ${token}`);
if(/GRANT\s+ALL\s+TO\s+anon/i.test(migrations)) throw new Error('Master gate detected anonymous privilege escalation');
console.log('MASTER PRODUCTION VERIFICATION CONTRACT: PASS');
