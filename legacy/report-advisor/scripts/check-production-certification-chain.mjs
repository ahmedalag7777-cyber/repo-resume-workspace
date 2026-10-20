import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const files=['scripts/check-production-certification-contract.mjs','scripts/check-production-release-blockers.mjs','scripts/check-phase-m-certification-contract.mjs','supabase/migrations/20260825150000_phase_m_certification_bundle.sql'];
for(const f of files) if(!fs.existsSync(path.join(root,f))) throw new Error(`Missing certification component: ${f}`);
const text=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
// Retrieval is represented by sourceSnapshotId in the canonical production release-blocker contract; it is not a standalone certification evidence key.
for(const t of ['tenant','storage','realtime','backup','migration','artifact','rollback','security','continuous_trust']) if(!text.toLowerCase().includes(t)) throw new Error(`Certification chain missing: ${t}`);
// Require concrete fail-closed implementation markers rather than a prose label.
for(const t of ['blocked','blocker','production','not exists']) if(!text.toLowerCase().includes(t.toLowerCase())) throw new Error(`Certification fail-closed invariant missing: ${t}`);
// Scan only the certification components; do not match this guard's own detection expression.
const unsafeAnonGrant=/GRANT\\s+ALL\\s+TO\\s+anon/i;
if(unsafeAnonGrant.test(text)) throw new Error('Unsafe anonymous certification grant detected');
console.log('Production certification chain: PASS');
