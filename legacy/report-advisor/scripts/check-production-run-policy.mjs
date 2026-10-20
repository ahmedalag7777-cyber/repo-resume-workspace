import fs from 'node:fs';
const p='src/lib/report-execution/production-run-policy.ts';
const s=fs.readFileSync(p,'utf8');
for(const t of ['assertExecutionRequest','source_hash_missing','tenant_not_verified','checkpoint_not_resumable','evidence_not_ready','rollback_not_ready','critical_drift','autonomy_not_eligible','blockers.length === 0']) if(!s.includes(t)) throw new Error(`production policy contract missing: ${t}`);
console.log('Production run policy: PASS');
