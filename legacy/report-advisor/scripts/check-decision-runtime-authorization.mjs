import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260830202600_harden_decision_runtime_authorization.sql', 'utf8');

const required = [
  /current_company_id\(\)/i,
  /auth\.uid\(\)/i,
  /SELF_APPROVAL_FORBIDDEN/i,
  /requested_by/i,
  /v_status\s*<>\s*'IN_PROGRESS'/i,
  /WORK_ITEM_NOT_IN_PROGRESS/i,
  /assignee_id/i,
  /WORK_ITEM_ASSIGNEE_FORBIDDEN/i,
  /status\s*=\s*'IN_PROGRESS'/i,
  /status\s*=\s*'APPROVED'/i,
  /REVOKE ALL ON FUNCTION public\.decide_approval/i,
  /REVOKE ALL ON FUNCTION public\.complete_decision_work_item/i,
  // Approver authority contract: current_company_id() proves an active tenant membership;
  // approval additionally requires a distinct actor from requested_by.
  /v_company(?:\s+uuid)?\s*:=\s*public\.current_company_id\(\)/i,
  /IF\s+p_approve\s+AND\s+v_requested_by\s*=\s*v_user/i,
];
for (const pattern of required) if (!pattern.test(migration)) throw new Error(`Decision runtime authorization contract missing: ${pattern}`);

const forbidden = [
  { name: 'self approval bypass', pattern: /IF\s+p_approve\s+AND\s+v_requested_by\s*=\s*v_user/i },
  { name: 'unrestricted completion', pattern: /IF\s+v_status\s*<>\s*'IN_PROGRESS'/i },
  { name: 'assignee bypass', pattern: /v_assignee\s+IS\s+NOT\s+NULL\s+AND\s+v_assignee\s+<>\s+v_user/i },
];
for (const check of forbidden) if (!check.pattern.test(migration)) throw new Error(`Decision runtime authorization regression: ${check.name}`);

// Test-of-test: remove the complete self-approval guard using whitespace-tolerant matching.
const weakened = migration.replace(
  /IF\s+p_approve\s+AND\s+v_requested_by\s*=\s*v_user\s+THEN\s+RAISE\s+EXCEPTION\s+'SELF_APPROVAL_FORBIDDEN';\s*END\s+IF;\s*/i,
  ''
);
if (/SELF_APPROVAL_FORBIDDEN/i.test(weakened)) throw new Error('Decision self-approval test-of-test is invalid');
if (/IF\s+p_approve\s+AND\s+v_requested_by\s*=\s*v_user\s+THEN\s+RAISE\s+EXCEPTION\s+'SELF_APPROVAL_FORBIDDEN';\s*END\s+IF;\s*/i.test(migration) === false) {
  throw new Error('Decision self-approval guard was not detected');
}
if (/IF\s+p_approve\s+AND\s+v_requested_by\s*=\s*v_user\s+THEN\s+RAISE\s+EXCEPTION\s+'SELF_APPROVAL_FORBIDDEN';\s*END\s+IF;\s*/i.test(weakened)) {
  throw new Error('Decision self-approval guard survived weakening');
}

console.log('Decision runtime authorization hardening: PASS');
console.log('- approver authority is bounded to authenticated active tenant membership');
console.log('- approval actor must differ from requested_by (no self-approval)');
