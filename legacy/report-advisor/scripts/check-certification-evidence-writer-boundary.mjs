import fs from 'node:fs';
const migration = fs.readFileSync('supabase/migrations/20260830235920_harden_certification_evidence_writer_boundaries.sql','utf8');
const tables = ['trust_certifications','autonomy_certification_runs','backup_verification_runs','autonomy_rollback_drills'];
for (const table of tables) {
  const revoke = new RegExp(`REVOKE\\s+INSERT,\\s*UPDATE,\\s*DELETE,\\s*TRUNCATE\\s+ON\\s+TABLE\\s+public\\.${table}\\s+FROM\\s+authenticated`, 'i');
  if (!revoke.test(migration)) throw new Error(`CERTIFICATION_WRITER_GUARD_MISSING: ${table}`);
}
if (/GRANT\s+(INSERT|UPDATE|DELETE|TRUNCATE).*authenticated/i.test(migration)) throw new Error('CERTIFICATION_WRITER_DIRECT_GRANT');
console.log('CERTIFICATION_EVIDENCE_WRITER_BOUNDARY_PASS');
