import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL','SUPABASE_ANON_KEY','TEST_USER_A_EMAIL','TEST_USER_A_PASSWORD','TEST_APPROVER_EMAIL','TEST_APPROVER_PASSWORD','TEST_USER_B_EMAIL','TEST_USER_B_PASSWORD','TEST_EVIDENCE_SNAPSHOT_ID'];
for (const name of required) if (!process.env[name]) throw new Error(`MISSING_ENV:${name}`);

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const randomKey = `owner-e2e-${Date.now()}`;

async function signIn(email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user.id;
}
async function expectFailure(label, fn) {
  try { await fn(); } catch { console.log(`NEGATIVE PASS: ${label}`); return; }
  throw new Error(`NEGATIVE PATH DID NOT FAIL: ${label}`);
}

const userA = await signIn(process.env.TEST_USER_A_EMAIL, process.env.TEST_USER_A_PASSWORD);
const { data: decision, error: decisionError } = await client.rpc('create_runtime_decision', {
  p_decision_key: randomKey,
  p_decision_type: 'runtime_e2e',
  p_confidence: 0.95,
  p_expected_impact: 100,
  p_evidence: { source: 'synthetic', corpus: randomKey },
});
if (decisionError) throw decisionError;

const { data: approval, error: approvalError } = await client.rpc('request_decision_approval', {
  p_decision_id: decision,
  p_reason: 'deterministic authenticated runtime E2E',
});
if (approvalError) throw approvalError;

await expectFailure('self approval', async () => client.rpc('decide_approval', {
  p_approval_id: approval,
  p_approve: true,
  p_reason: 'self approval must be rejected',
}).then(({ error }) => { if (error) throw error; }));

await signIn(process.env.TEST_USER_B_EMAIL, process.env.TEST_USER_B_PASSWORD);
await expectFailure('cross-tenant approval', async () => client.rpc('decide_approval', {
  p_approval_id: approval,
  p_approve: true,
  p_reason: 'cross tenant must be rejected',
}).then(({ error }) => { if (error) throw error; }));

const approver = await signIn(process.env.TEST_APPROVER_EMAIL, process.env.TEST_APPROVER_PASSWORD);
if (approver === userA) throw new Error('APPROVER_MUST_DIFFER_FROM_REQUESTER');
const { error: approveError } = await client.rpc('decide_approval', {
  p_approval_id: approval,
  p_approve: true,
  p_reason: 'approved by separate test approver',
});
if (approveError) throw approveError;

await signIn(process.env.TEST_USER_A_EMAIL, process.env.TEST_USER_A_PASSWORD);
const { data: workItem, error: workItemError } = await client.rpc('create_decision_work_item', {
  p_decision_id: decision,
  p_recommendation_id: null,
  p_department: 'runtime-e2e',
  p_assignee_id: userA,
  p_assignee_label: 'synthetic owner e2e',
  p_title: 'Synthetic runtime decision action',
  p_description: 'Deterministic non-production E2E corpus',
  p_priority: 'MEDIUM',
  p_due_at: null,
  p_expected_impact: 100,
  p_evidence_refs: [],
});
if (workItemError) throw workItemError;

await signIn(process.env.TEST_USER_B_EMAIL, process.env.TEST_USER_B_PASSWORD);
await expectFailure('wrong assignee start', async () => client.rpc('start_decision_work_item', { p_work_item_id: workItem }).then(({ error }) => { if (error) throw error; }));

await signIn(process.env.TEST_USER_A_EMAIL, process.env.TEST_USER_A_PASSWORD);
const { error: startError } = await client.rpc('start_decision_work_item', { p_work_item_id: workItem });
if (startError) throw startError;

await expectFailure('outcome without valid work item', async () => client.rpc('complete_decision_work_item', {
  p_work_item_id: crypto.randomUUID(), p_actual_impact: 100, p_evidence: { evidence_snapshot_id: process.env.TEST_EVIDENCE_SNAPSHOT_ID },
}).then(({ error }) => { if (error) throw error; }));

await expectFailure('missing outcome evidence', async () => client.rpc('complete_decision_work_item', {
  p_work_item_id: workItem, p_actual_impact: 90, p_evidence: {},
}).then(({ error }) => { if (error) throw error; }));

const forged = { evidence_snapshot_id: process.env.TEST_EVIDENCE_SNAPSHOT_ID, work_item_id: 'forged-by-caller', outcome_delta: 999, source: 'synthetic' };
const { error: completeError } = await client.rpc('complete_decision_work_item', {
  p_work_item_id: workItem,
  p_actual_impact: 90,
  p_evidence: forged,
});
if (completeError) throw completeError;

await expectFailure('duplicate completion', async () => client.rpc('complete_decision_work_item', {
  p_work_item_id: workItem, p_actual_impact: 90, p_evidence: forged,
}).then(({ error }) => { if (error) throw error; }));

const { data: outcome, error: outcomeError } = await client.from('recommendation_outcomes')
  .select('evidence,actual_impact,status').eq('decision_id', decision).single();
if (outcomeError) throw outcomeError;
if (outcome.actual_impact !== 90 || outcome.evidence.work_item_id !== workItem || outcome.evidence.outcome_delta !== -10 || outcome.evidence.evidence_snapshot_id !== process.env.TEST_EVIDENCE_SNAPSHOT_ID) {
  throw new Error('GENERATED_PROVENANCE_ASSERTION_FAILED');
}

const { data: finalDecision, error: finalError } = await client.from('business_intelligence_decisions')
  .select('status').eq('id', decision).single();
if (finalError) throw finalError;
if (finalDecision.status !== 'EXECUTED') throw new Error(`DECISION_NOT_EXECUTED:${finalDecision.status}`);

console.log(JSON.stringify({ status: 'PASS', synthetic: true, decision, workItem, tested: [
  'self approval', 'cross tenant approval', 'wrong assignee start', 'valid start',
  'invalid outcome work item', 'missing outcome evidence', 'generated provenance precedence', 'duplicate completion', 'terminal decision execution'
] }, null, 2));
