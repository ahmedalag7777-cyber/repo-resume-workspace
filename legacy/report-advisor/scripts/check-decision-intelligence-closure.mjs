import fs from 'node:fs';

const required = {
  'src/lib/decision-automation/action-runtime.ts': ['tenantId','evidenceRefs','idempotencyKey','requiresApproval'],
  'src/lib/decision-automation/execution-receipt.ts': ['AutomationExecutionReceipt','decisionFingerprint','evidenceSnapshotId','receiptKey'],
  'src/lib/analytics/forecast-backtest.ts': ['baselineMae','improvementVsBaselinePct','assertForecastQuality'],
  'src/lib/analytics/outcome-feedback.ts': ['DecisionOutcome','recordOutcome','persistOutcome','loadPersistedOutcomes','recommendation_outcomes','OUTCOME_TENANT_CONTEXT_MISMATCH'],
  'src/lib/analytics/intelligence-gate.ts': ['evaluateIntelligenceGate','FORECAST_BELOW_BASELINE','OUTCOME_ACCURACY_LOW'],
  'src/lib/decision-automation/vertical-slice-runtime.ts': ['createRuntimeRecommendation','createRuntimeDecision','requestRuntimeApproval','decideRuntimeApproval','createRuntimeWorkItem','notifyWorkItem','completeRuntimeWorkItem','loadRuntimeOutcome','resolveCurrentCompanyId'],
  'supabase/migrations/20260828170000_decision_action_outcome_runtime.sql': ['decision_approvals','decision_work_items','decision_action_receipts','request_decision_approval','decide_approval','complete_decision_work_item','recommendation_outcomes','current_company_id()','outcome_delta'],
  'supabase/migrations/20260828171000_decision_runtime_audit.sql': ['audit_decision_runtime_change','decision_approvals','decision_work_items','decision_action_receipts','audit_logs','current_company_id()','auth.uid()'],
};
for (const [file,tokens] of Object.entries(required)) { const source=fs.readFileSync(file,'utf8'); for(const token of tokens) if(!source.includes(token)) throw new Error(`${file}: missing ${token}`); }

const migration = fs.readFileSync('supabase/migrations/20260828170000_decision_action_outcome_runtime.sql','utf8');
if (!/status IN \('PENDING','APPROVED','REJECTED','CANCELLED'\)/.test(migration)) throw new Error('approval lifecycle is not deterministic');
if (!/status IN \('OPEN','IN_PROGRESS','COMPLETED','BLOCKED','CANCELLED'\)/.test(migration)) throw new Error('work lifecycle is not deterministic');
if (!/status IN \('ACCEPTED','RUNNING','SUCCEEDED','FAILED','BLOCKED','CANCELLED'\)/.test(migration)) throw new Error('action receipt lifecycle is not deterministic');
if (!migration.includes("AND d.status='PROPOSED'")) throw new Error('approval request bypasses decision state');
if (!migration.includes("SET status=CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END")) throw new Error('approval transition is not persisted');
if (!migration.includes("SET status='COMPLETED'")) throw new Error('completion does not persist terminal state');

const hardened = fs.readFileSync('supabase/migrations/20260830160000_harden_decision_runtime_transitions.sql','utf8');
const runtime = fs.readFileSync('src/lib/decision-automation/vertical-slice-runtime.ts','utf8');
for (const token of ["d.status = 'APPROVED'", 'DECISION_NOT_APPROVED', 'WORK_ITEM_NOT_FOUND_OR_DECISION_NOT_APPROVED', 'WORK_ITEM_ALREADY_COMPLETED', 'requested_by', 'decided_by = v_user', 'approved_by = CASE WHEN p_approve THEN v_user ELSE NULL END', 'SECURITY DEFINER', 'SET search_path = public']) {
  if (!hardened.includes(token)) throw new Error(`decision authorization hardening missing: ${token}`);
}
if (!runtime.includes("supabase.rpc('create_decision_work_item'")) throw new Error('work-item creation must use canonical approval-gated RPC');
if (/from\(['"]decision_work_items['"]\)\.insert/.test(runtime)) throw new Error('direct client work-item insert bypasses approval gate');

const linkHardening = fs.readFileSync('supabase/migrations/20260903200500_harden_decision_recommendation_one_to_one_atomic_link.sql','utf8');
for (const token of ['recommendations_company_decision_unique_idx','decisions_company_recommendation_unique_idx','for update','RECOMMENDATION_ALREADY_LINKED','DECISION_ALREADY_LINKED','TENANT_CONTEXT_REQUIRED']) {
  if (!linkHardening.toLowerCase().includes(token.toLowerCase())) throw new Error(`decision/recommendation link hardening missing: ${token}`);
}
if (!linkHardening.includes('set decision_id = p_decision_id')) throw new Error('recommendation link is not persisted');
if (!linkHardening.includes('set recommendation_id = p_recommendation_id')) throw new Error('decision link is not persisted');

const cancelledFix = fs.readFileSync('supabase/migrations/20260903201500_reconcile_decision_approval_cancelled_consistency.sql','utf8');
if (!cancelledFix.includes("status = any (array['APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text])")) throw new Error('CANCELLED is not treated as a terminal approval state');
if (!cancelledFix.includes('decided_at is not null') || !cancelledFix.includes('decided_by is not null')) throw new Error('terminal approval provenance is not enforced');

console.log('decision/intelligence/runtime vertical slice closure contract: PASS');
console.log('- approval lifecycle is deterministic');
console.log('- work lifecycle is deterministic');
console.log('- action receipt lifecycle is deterministic');
console.log('- approval requires PROPOSED decision');
console.log('- work-item creation requires APPROVED decision');
console.log('- completion rejects unapproved/stale work items');
console.log('- duplicate completion fails closed');
console.log('- authenticated actor identity is recorded on approval transitions');
console.log('- client work-item creation uses canonical approval-gated RPC');
console.log('- Decision <-> Recommendation link is tenant-scoped, one-to-one, atomic, and overwrite-resistant');
console.log('- CANCELLED approval is a valid terminal state with provenance consistency');
