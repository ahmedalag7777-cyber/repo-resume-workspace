import assert from 'node:assert/strict';
const A={tenant_id:'tenant-a',user_id:'user-a'}, B={tenant_id:'tenant-b',user_id:'user-b'}, P={tenant_id:'tenant-a',user_id:'approver-a'};
function decision(a){assert(a.tenant_id&&a.user_id);return{id:'d1',tenant_id:a.tenant_id,created_by:a.user_id,status:'DRAFT'};}
function assign(d,a,w){assert.equal(d.tenant_id,a.tenant_id);assert.equal(w.tenant_id,a.tenant_id);assert.equal(w.assignee_id,a.user_id);return{...w,status:'ASSIGNED'};}
function approve(d,a){assert.equal(d.tenant_id,a.tenant_id);assert.notEqual(d.created_by,a.user_id,'SELF_APPROVAL');assert.equal(d.status,'DRAFT','TERMINAL');return{...d,status:'APPROVED',approved_by:a.user_id};}
function complete(w,a){assert.equal(w.tenant_id,a.tenant_id,'TENANT');assert.equal(w.assignee_id,a.user_id,'ASSIGNEE');assert.notEqual(w.status,'COMPLETED','ALREADY_COMPLETED');return{...w,status:'COMPLETED'};}
function execute(d,a,w){assert.equal(d.tenant_id,a.tenant_id,'TENANT');assert.equal(d.status,'APPROVED','APPROVAL_REQUIRED');assert.equal(w.status,'COMPLETED','WORK_INCOMPLETE');return{...d,status:'EXECUTED'};}
function outcome(d,w,a,e){assert.equal(d.tenant_id,a.tenant_id,'TENANT');assert.equal(w.tenant_id,a.tenant_id,'WORK_TENANT');assert.equal(w.status,'COMPLETED','WORK_INCOMPLETE');assert.equal(d.status,'EXECUTED','DECISION_NOT_EXECUTED');assert.ok(e?.id,'EVIDENCE_REQUIRED');return{id:'o1',decision_id:d.id,work_item_id:w.id,tenant_id:a.tenant_id,evidence_id:e.id,provenance:{generated:true,decision_id:d.id,work_item_id:w.id}};}
function finalize(d,a){assert.equal(d.tenant_id,a.tenant_id,'TENANT');assert.equal(d.status,'EXECUTED','NOT_EXECUTED');return{...d,status:'FINALIZED'};}
let d=decision(A), w=assign(d,A,{id:'w1',tenant_id:'tenant-a',assignee_id:'user-a'});
assert.throws(()=>execute(d,A,w),/APPROVAL_REQUIRED/); d=approve(d,P);
assert.throws(()=>execute(d,A,{...w,status:'ASSIGNED'}),/WORK_INCOMPLETE/); w=complete(w,A); d=execute(d,A,w);
const o=outcome(d,w,A,{id:'e1'}); assert.equal(o.provenance.generated,true); assert.equal(finalize(d,A).status,'FINALIZED');
assert.throws(()=>complete(w,A),/ALREADY_COMPLETED/); assert.throws(()=>execute(d,A,w),/APPROVAL_REQUIRED/); assert.throws(()=>approve(decision(A),A),/SELF_APPROVAL/);
assert.throws(()=>execute({...d,tenant_id:'tenant-b'},A,w),/TENANT/); assert.throws(()=>complete({...w,assignee_id:'user-b'},A),/ASSIGNEE/);
assert.throws(()=>outcome(d,{...w,status:'ASSIGNED'},A,{id:'e1'}),/WORK_INCOMPLETE/); assert.throws(()=>outcome(d,{...w,tenant_id:'tenant-b'},A,{id:'e1'}),/WORK_TENANT/); assert.throws(()=>outcome(d,w,A,null),/EVIDENCE_REQUIRED/);
assert.throws(()=>finalize(d,B),/TENANT/); console.log('decision-work-outcome terminal matrix: PASS');
