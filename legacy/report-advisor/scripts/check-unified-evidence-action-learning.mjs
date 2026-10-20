import assert from 'node:assert/strict';

const TYPES = new Set(['STATIC','CI','SYNTHETIC RUNTIME','LIVE SQL','AUTHENTICATED LIVE','PRODUCTION']);
const stages = ['DOCUMENT','EVIDENCE','RECOMMENDATION','DECISION','WORK_ITEM','OUTCOME','LEARNING'];

function transition(state, next, actor) {
  assert(actor?.tenant_id && actor.user_id, 'ACTOR_REQUIRED');
  assert.equal(state.tenant_id, actor.tenant_id, 'TENANT_BOUNDARY');
  assert.equal(stages.indexOf(next), stages.indexOf(state.stage) + 1, 'INVALID_STAGE');
  if (next === 'EVIDENCE') assert.ok(state.source_ref && state.content_hash, 'PROVENANCE_REQUIRED');
  if (next === 'RECOMMENDATION') assert.ok(state.evidence_id, 'EVIDENCE_REQUIRED');
  if (next === 'DECISION') { assert.equal(state.recommendation_id, state.id, 'RECOMMENDATION_LINK_REQUIRED'); assert.notEqual(state.created_by, actor.user_id, 'SELF_APPROVAL'); }
  if (next === 'WORK_ITEM') assert.equal(state.decision_status, 'APPROVED', 'APPROVAL_REQUIRED');
  if (next === 'OUTCOME') assert.equal(state.work_status, 'COMPLETED', 'WORK_INCOMPLETE');
  if (next === 'LEARNING') { assert.equal(state.outcome_status, 'RECORDED', 'OUTCOME_NOT_FINAL'); assert.ok(state.outcome_evidence_id, 'OUTCOME_EVIDENCE_REQUIRED'); }
  return {...state, stage:next};
}

const actor={tenant_id:'tenant-a',user_id:'owner-a'}, approver={tenant_id:'tenant-a',user_id:'approver-a'};
let s={tenant_id:'tenant-a',user_id:'owner-a',stage:'DOCUMENT',source_ref:'doc:1',content_hash:'sha256:x',id:'rec-1',created_by:'owner-a'};
s=transition(s,'EVIDENCE',actor); s.evidence_id='e1';
s=transition(s,'RECOMMENDATION',actor); s.recommendation_id=s.id; s.decision_status='APPROVED';
s=transition(s,'DECISION',approver); s.work_status='COMPLETED'; s.outcome_status='RECORDED'; s.outcome_evidence_id='e1';
s=transition(s,'WORK_ITEM',actor); s=transition(s,'OUTCOME',actor); s=transition(s,'LEARNING',actor);
assert.equal(s.stage,'LEARNING');
assert.ok(TYPES.has('SYNTHETIC RUNTIME'));

function assertTransitionError(label, state, next, transitionActor, pattern) {
  assert.ok(transitionActor?.tenant_id && transitionActor.user_id, `${label}: TEST_ACTOR_REQUIRED`);
  assert.throws(() => transition(state, next, transitionActor), pattern, `${label}: unexpected transition rejection`);
}

assert.throws(() => transition({...s,stage:'DOCUMENT'}, undefined), /ACTOR_REQUIRED/);
assertTransitionError('invalid-stage-from-learning', {...s,stage:'DOCUMENT'}, 'DOCUMENT', actor, /INVALID_STAGE/);
assertTransitionError('tenant-boundary', {...s,stage:'DOCUMENT',tenant_id:'tenant-b'}, 'DOCUMENT', actor, /TENANT_BOUNDARY/);
assertTransitionError('missing-source-ref', {...s,stage:'DOCUMENT',source_ref:''}, 'EVIDENCE', actor, /INVALID_STAGE|PROVENANCE_REQUIRED/);
assertTransitionError('missing-content-hash', {...s,stage:'DOCUMENT',content_hash:''}, 'EVIDENCE', actor, /INVALID_STAGE|PROVENANCE_REQUIRED/);
assertTransitionError('recommendation-link', {...s,stage:'RECOMMENDATION',recommendation_id:'other'}, 'DECISION', approver, /RECOMMENDATION_LINK_REQUIRED/);
assertTransitionError('decision-approval', {...s,stage:'DECISION',decision_status:'DRAFT'}, 'WORK_ITEM', actor, /APPROVAL_REQUIRED/);
assertTransitionError('work-complete', {...s,stage:'WORK_ITEM',work_status:'ASSIGNED'}, 'OUTCOME', actor, /WORK_INCOMPLETE/);

console.log('unified evidence action learning chain: PASS');
