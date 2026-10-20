import assert from 'node:assert/strict';

const STATES=['AUTHENTICATED LIVE','PRODUCTION'];
const STEPS=['login','tenant_context','read','write','decision','document','export','realtime','storage','logout'];
function verify(run){
  assert(run.exact_sha,'EXACT_SHA_REQUIRED');
  assert(STATES.includes(run.evidence_type),'LIVE_EVIDENCE_REQUIRED');
  for(const step of STEPS) assert(run.steps?.[step]==='PASS',`${step.toUpperCase()}_NOT_PASS`);
  assert(run.tenant_a && run.tenant_b,'TWO_TENANTS_REQUIRED');
  assert(run.cross_tenant==='BLOCKED','CROSS_TENANT_MUST_BLOCK');
  return {authenticated_live_verified:run.evidence_type==='AUTHENTICATED LIVE',production_verified:run.evidence_type==='PRODUCTION'};
}
const synthetic={exact_sha:'sha',evidence_type:'AUTHENTICATED LIVE',steps:Object.fromEntries(STEPS.map(s=>[s,'PASS'])),tenant_a:true,tenant_b:true,cross_tenant:'BLOCKED'};
assert.deepEqual(verify(synthetic),{authenticated_live_verified:true,production_verified:false});
assert.throws(()=>verify({...synthetic,exact_sha:''}),/EXACT_SHA_REQUIRED/);
assert.throws(()=>verify({...synthetic,cross_tenant:'ALLOWED'}),/CROSS_TENANT_MUST_BLOCK/);
assert.throws(()=>verify({...synthetic,steps:{...synthetic.steps,storage:'FAIL'}}),/STORAGE_NOT_PASS/);
assert.deepEqual(verify({...synthetic,evidence_type:'PRODUCTION'}),{authenticated_live_verified:false,production_verified:true});
console.log('production e2e evidence contract: PASS');
