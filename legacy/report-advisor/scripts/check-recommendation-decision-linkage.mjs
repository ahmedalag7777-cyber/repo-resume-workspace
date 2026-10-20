import assert from 'node:assert/strict';

function createRecommendation(actor, evidence) {
  assert(actor?.tenant_id && actor.user_id, 'ACTOR_REQUIRED');
  assert(evidence?.id && evidence.tenant_id === actor.tenant_id, 'EVIDENCE_BOUNDARY');
  return { id:'rec-001', tenant_id:actor.tenant_id, created_by:actor.user_id, evidence_id:evidence.id, status:'PROPOSED' };
}
function decide(rec, actor, approval) {
  assert.equal(rec.tenant_id, actor.tenant_id, 'TENANT_BOUNDARY');
  assert.notEqual(rec.created_by, actor.user_id, 'SELF_APPROVAL_FORBIDDEN');
  assert.equal(approval?.evidence_id, rec.evidence_id, 'APPROVAL_EVIDENCE_MISMATCH');
  assert.equal(rec.status, 'PROPOSED', 'INVALID_DECISION_STATE');
  return { ...rec, status:'APPROVED', approved_by:actor.user_id };
}
const A={tenant_id:'tenant-a',user_id:'user-a'}, P={tenant_id:'tenant-a',user_id:'approver-a'};
const ev={id:'evidence-a',tenant_id:'tenant-a',type:'SYNTHETIC RUNTIME'};
const rec=createRecommendation(A,ev);
const approved=decide(rec,P,{evidence_id:ev.id});
assert.equal(approved.status,'APPROVED');
assert.throws(()=>decide(rec,A,{evidence_id:ev.id}),/SELF_APPROVAL_FORBIDDEN/);
assert.throws(()=>decide(rec,{...P,tenant_id:'tenant-b'},{evidence_id:ev.id}),/TENANT_BOUNDARY/);
assert.throws(()=>decide(rec,P,{evidence_id:'other'}),/APPROVAL_EVIDENCE_MISMATCH/);
assert.throws(()=>createRecommendation(A,{id:'evidence-b',tenant_id:'tenant-b'}),/EVIDENCE_BOUNDARY/);
console.log('recommendation decision linkage: PASS');
