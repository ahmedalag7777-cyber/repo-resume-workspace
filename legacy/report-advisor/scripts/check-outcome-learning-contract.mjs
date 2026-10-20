import assert from 'node:assert/strict';

function learn(outcome, decision) {
  assert(outcome?.id && outcome.work_item_id, 'OUTCOME_IDENTITY_REQUIRED');
  assert.equal(outcome.tenant_id, decision.tenant_id, 'TENANT_BOUNDARY');
  assert.equal(outcome.decision_id, decision.id, 'DECISION_LINK_REQUIRED');
  assert.equal(outcome.status, 'RECORDED', 'OUTCOME_NOT_FINAL');
  assert.ok(outcome.evidence_id, 'OUTCOME_EVIDENCE_REQUIRED');
  return { tenant_id: outcome.tenant_id, decision_id: decision.id, outcome_id: outcome.id, evidence_id: outcome.evidence_id, learned: true };
}

const decision={id:'decision-a',tenant_id:'tenant-a'};
const outcome={id:'outcome-a',work_item_id:'work-a',decision_id:'decision-a',tenant_id:'tenant-a',status:'RECORDED',evidence_id:'evidence-a'};
assert.deepEqual(learn(outcome,decision),{tenant_id:'tenant-a',decision_id:'decision-a',outcome_id:'outcome-a',evidence_id:'evidence-a',learned:true});
assert.throws(()=>learn({...outcome,tenant_id:'tenant-b'},decision),/TENANT_BOUNDARY/);
assert.throws(()=>learn({...outcome,decision_id:'other'},decision),/DECISION_LINK_REQUIRED/);
assert.throws(()=>learn({...outcome,status:'DRAFT'},decision),/OUTCOME_NOT_FINAL/);
assert.throws(()=>learn({...outcome,evidence_id:''},decision),/OUTCOME_EVIDENCE_REQUIRED/);
console.log('outcome learning contract: PASS');
