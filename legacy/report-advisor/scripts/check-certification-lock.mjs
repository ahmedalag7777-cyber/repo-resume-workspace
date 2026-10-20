import assert from 'node:assert/strict';

const DOMAINS=['tenant','document','decision','security','performance','reliability','dr','e2e'];
function lock(m){
  assert(m.exact_sha,'EXACT_SHA_REQUIRED');
  assert(m.mode==='CERTIFICATION','CERTIFICATION_MODE_REQUIRED');
  for(const d of DOMAINS){assert(m[d]?.status==='PASS',`${d.toUpperCase()}_NOT_PASS`);assert(m[d]?.evidence_id,`${d.toUpperCase()}_EVIDENCE_REQUIRED`);}
  return {locked:true,exact_sha:m.exact_sha};
}
const base=Object.fromEntries(DOMAINS.map(d=>[d,{status:'PASS',evidence_id:`e-${d}`} ]));
assert.deepEqual(lock({...base,exact_sha:'sha',mode:'CERTIFICATION'}),{locked:true,exact_sha:'sha'});
assert.throws(()=>lock({...base,exact_sha:'',mode:'CERTIFICATION'}),/EXACT_SHA_REQUIRED/);
assert.throws(()=>lock({...base,exact_sha:'sha',mode:'NORMAL'}),/CERTIFICATION_MODE_REQUIRED/);
assert.throws(()=>lock({...base,exact_sha:'sha',mode:'CERTIFICATION',e2e:{status:'BLOCKED',evidence_id:'e'}}),/E2E_NOT_PASS/);
console.log('certification lock: PASS');
