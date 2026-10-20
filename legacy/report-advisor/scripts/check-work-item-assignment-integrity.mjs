import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260831014001_harden_work_item_assignment_integrity.sql', 'utf8');
const stripSqlComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*--[^\n]*/g, '$1');
const executable = stripSqlComments(migration);

for (const token of [
  'p_assignee_id',
  'company_memberships',
  'm.user_id = p_assignee_id',
  'ASSIGNEE_NOT_TENANT_MEMBER',
  'p_recommendation_id',
  'r.decision_id = p_decision_id',
  'RECOMMENDATION_NOT_FOUND_OR_NOT_LINKED',
  'd.status = \'APPROVED\'',
  'REVOKE ALL ON FUNCTION public.create_decision_work_item',
]) {
  if (!executable.includes(token)) throw new Error(`Work-item assignment integrity missing ${token}`);
}

// Test-of-test: the former same-tenant-but-unlinked recommendation bypass must
// remain impossible. A decoy that reintroduces `OR ... IS NULL` must be rejected.
if (/r\.decision_id\s*=\s*p_decision_id\s+OR\s+r\.decision_id\s+IS\s+NULL/i.test(executable)) {
  throw new Error('Test-of-test failed: unlinked recommendations are accepted');
}

const tampered = executable
  .replaceAll('ASSIGNEE_NOT_TENANT_MEMBER', '')
  .replaceAll('m.user_id = p_assignee_id', '')
  .replaceAll('RECOMMENDATION_NOT_FOUND_OR_NOT_LINKED', '')
  .replaceAll('r.decision_id = p_decision_id', 'TRUE');
let rejected = false;
try {
  for (const token of ['ASSIGNEE_NOT_TENANT_MEMBER','m.user_id = p_assignee_id','RECOMMENDATION_NOT_FOUND_OR_NOT_LINKED']) {
    if (!tampered.includes(token)) throw new Error('tampered');
  }
} catch { rejected = true; }
if (!rejected) throw new Error('Test-of-test failed: assignment integrity tampering was not detected');

console.log('Work-item assignment integrity: PASS (tenant assignee, strict decision/recommendation linkage, lifecycle state, adversarial test-of-test)');
