import fs from 'node:fs';

const sql = fs.readFileSync(
  'supabase/migrations/20260830200001_enforce_work_item_assignee.sql',
  'utf8',
);

for (const pattern of [
  /v_company\s+uuid\s*:=\s*public\.current_company_id\(\)/i,
  /v_user\s+uuid\s*:=\s*auth\.uid\(\)/i,
  /v_status\s+text/i,
  /v_status\s*<>\s*'IN_PROGRESS'/i,
  /v_assignee\s+uuid/i,
  /v_assignee\s+IS\s+NOT\s+NULL\s+AND\s+v_assignee\s+<>\s+v_user/i,
  /WORK_ITEM_ASSIGNEE_FORBIDDEN/i,
  /v_evidence_snapshot_id\s+text/i,
  /OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN/i,
  /REVOKE ALL ON FUNCTION public\.complete_decision_work_item/i,
  /REVOKE ALL ON FUNCTION public\.complete_decision_work_item\(uuid,numeric,jsonb\) FROM PUBLIC, anon/i,
  /GRANT EXECUTE ON FUNCTION public\.complete_decision_work_item\(uuid,numeric,jsonb\) TO authenticated/i,
]) {
  if (!pattern.test(sql)) {
    throw new Error(`Missing work-item authorization invariant: ${pattern}`);
  }
}

console.log(
  'Work-item assignment integrity: PASS (tenant, actor, lifecycle, evidence, and EXECUTE ACL boundaries)',
);
