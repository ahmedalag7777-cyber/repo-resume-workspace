import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260830235910_harden_direct_truth_writers.sql','utf8');
const required = [
  'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.decision_outcomes FROM authenticated',
  'GRANT SELECT ON TABLE public.decision_outcomes TO authenticated',
  'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM authenticated',
];
for (const token of required) {
  if (!migration.includes(token)) throw new Error(`DIRECT_TRUTH_WRITER_GUARD_MISSING: ${token}`);
}
if (/GRANT\s+(INSERT|UPDATE|DELETE|TRUNCATE).*decision_outcomes.*authenticated/i.test(migration)) {
  throw new Error('DIRECT_DECISION_OUTCOME_DML_BYPASS');
}
if (/GRANT\s+INSERT.*audit_logs.*authenticated/i.test(migration)) {
  throw new Error('DIRECT_AUDIT_INSERT_BYPASS');
}
console.log('DIRECT_TRUTH_WRITER_GUARD_PASS');
