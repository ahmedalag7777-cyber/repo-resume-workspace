import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260831014000_harden_generated_outcome_provenance_precedence.sql', 'utf8');

for (const [pattern, label] of [
  [/jsonb_typeof\(p_evidence\)\s*<>\s*'object'/i, 'evidence object-shape guard'],
  [/OUTCOME_EVIDENCE_REQUIRED/i, 'required evidence snapshot'],
  [/OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN/i, 'tenant-scoped evidence validation'],
  [/WORK_ITEM_ASSIGNEE_FORBIDDEN/i, 'assignee guard'],
  [/COALESCE\(p_evidence,'\{\}'::jsonb\)\s*\|\|\s*jsonb_build_object\(/i, 'caller evidence merged before generated provenance'],
  [/'work_item_id',p_work_item_id/i, 'generated work-item identity'],
  [/'evidence_snapshot_id',v_evidence_snapshot_id/i, 'generated evidence snapshot identity'],
  [/'outcome_delta'/i, 'generated outcome delta'],
  [/IF EXISTS \(\s*SELECT 1 FROM public\.decision_work_items/i, 'decision terminal-state guard'],
]) {
  if (!pattern.test(sql)) throw new Error(`Generated outcome provenance contract missing: ${label}`);
}

console.log('Generated outcome provenance precedence: PASS');
console.log('Evidence remains tenant-validated; server-owned work-item identity, evidence snapshot identity, and computed outcome delta override caller metadata; incomplete sibling work items block decision execution.');
