import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const migration = fs.readFileSync(path.join(root,'supabase/migrations/20260825150000_phase_m_certification_bundle.sql'),'utf8');
for (const token of ['production_certification_bundles','production_rollback_drills','can_release_production_certification','tenant_isolation_passed','backup_restore_passed','migration_parity_passed','artifact_integrity_passed','rollback_passed','security_audit_passed','REVOKE ALL ON TABLE','WITH CHECK']) {
  if (!migration.includes(token)) throw new Error(`Phase M contract missing: ${token}`);
}
if (migration.includes('GRANT ALL TO anon')) throw new Error('Unsafe Phase M anon grant');
console.log('Phase M certification contract: PASS');
