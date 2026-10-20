import assert from 'node:assert/strict';

const A={authenticated:true,tenant_id:'tenant-a',user_id:'user-a'};
const B={authenticated:true,tenant_id:'tenant-b',user_id:'user-b'};
function authorize(ctx, resource, action){
  assert.equal(ctx.authenticated,true,'AUTH_REQUIRED');
  assert.equal(ctx.tenant_id,resource.tenant_id,'TENANT_BOUNDARY');
  if(action==='write') assert.equal(resource.owner_id,ctx.user_id,'OWNER_REQUIRED');
  return true;
}
function exportData(ctx, resource){authorize(ctx,resource,'read'); assert.equal(resource.exportable,true,'EXPORT_FORBIDDEN'); return true;}
function decisionAction(ctx, decision){authorize(ctx,decision,'read'); assert.equal(decision.status,'APPROVED','APPROVAL_REQUIRED'); return true;}
const r={tenant_id:'tenant-a',owner_id:'user-a',exportable:true};
const d={tenant_id:'tenant-a',status:'APPROVED'};
assert(authorize(A,r,'read')); assert(authorize(A,r,'write')); assert(exportData(A,r)); assert(decisionAction(A,d));
assert.throws(()=>authorize(B,r,'read'),/TENANT_BOUNDARY/);
assert.throws(()=>authorize({...A,authenticated:false},r,'read'),/AUTH_REQUIRED/);
assert.throws(()=>authorize(A,{...r,owner_id:'user-b'},'write'),/OWNER_REQUIRED/);
assert.throws(()=>exportData(A,{...r,exportable:false}),/EXPORT_FORBIDDEN/);
assert.throws(()=>decisionAction(A,{...d,status:'DRAFT'}),/APPROVAL_REQUIRED/);
console.log('authenticated e2e authorization matrix: PASS');
