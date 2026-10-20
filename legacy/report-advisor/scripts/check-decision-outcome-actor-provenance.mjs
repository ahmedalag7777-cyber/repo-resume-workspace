import fs from 'node:fs';

const actorMigration = fs.readFileSync('supabase/migrations/20260831090000_harden_decision_outcome_actor_identity.sql','utf8');
const terminalMigration = fs.readFileSync('supabase/migrations/20260831143000_harden_decision_outcome_work_item_terminal.sql','utf8');
const migration = `${actorMigration}\n${terminalMigration}`;
for (const token of [
  'recommendation_outcomes',
  'decision_outcomes',
  'observed_by uuid',
  'auth.uid()',
  'observed_by',
  'OUTCOME_IDENTITY_INCOMPLETE',
  'OUTCOME_EVIDENCE_REQUIRED',
  'OUTCOME_PROVENANCE_NOT_FOUND',
  'TENANT_CONTEXT_REQUIRED',
  'OUTCOME_WORK_ITEM_REQUIRED',
  'OUTCOME_WORK_ITEM_NOT_FOUND_OR_FORBIDDEN',
  'OUTCOME_DECISION_NOT_EXECUTED_OR_FORBIDDEN',
  'decision_work_items',
  "w.status = 'COMPLETED'",
  'w.decision_id = v_decision',
]) {
  if (!migration.includes(token)) throw new Error(`missing outcome actor provenance guard: ${token}`);
}

const recommendationInsert = migration.match(/INSERT INTO public\.recommendation_outcomes\(([^)]+)\)/)?.[1] ?? '';
const decisionInsert = migration.match(/INSERT INTO public\.decision_outcomes\(([^)]+)\)/)?.[1] ?? '';
if (!recommendationInsert.includes('observed_by')) throw new Error('recommendation outcome does not persist actor identity');
if (!decisionInsert.includes('observed_by')) throw new Error('decision outcome does not persist actor identity');
if (!migration.includes('w.status = \'COMPLETED\'')) throw new Error('decision outcome does not require completed work item');
if (!migration.includes('w.decision_id = v_decision')) throw new Error('decision outcome work item is not linked to the executed decision');
if (!migration.includes('p_action_id !~*')) throw new Error('decision outcome does not reject non-UUID work-item identities');
if (!migration.includes('observed_by=EXCLUDED.observed_by')) throw new Error('recommendation outcome update can lose actor identity');

console.log('decision outcome actor provenance contract: PASS');
console.log('- authenticated actor is required');
console.log('- tenant context is required');
console.log('- recommendation outcomes persist observed_by');
console.log('- decision outcomes persist observed_by');
console.log('- conflict update preserves observed_by');
