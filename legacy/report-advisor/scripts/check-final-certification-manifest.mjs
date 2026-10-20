import assert from 'node:assert/strict';

const DOMAINS=['tenant','document','decision','security','performance','reliability','dr','e2e'];
const TYPES=['STATIC','CI','SYNTHETIC RUNTIME','LIVE SQL','AUTHENTICATED LIVE','PRODUCTION'];
function certify(m){
  assert(m.exact_sha,'EXACT_SHA_REQUIRED');
  for(const d of DOMAINS){assert(m[d]?.status==='PASS',`${d.toUpperCase()}_NOT_PASS`);assert(TYPES.includes(m[d]?.type),`${d.toUpperCase()}_TYPE_INVALID`);assert(m[d]?.evidence_id,`${d.toUpperCase()}_EVIDENCE_REQUIRED`);}
  const live=DOMAINS.every(d=>['AUTHENTICATED LIVE','PRODUCTION'].includes(m[d].type));
  const production=DOMAINS.every(d=>m[d].type==='PRODUCTION');
  return {repository_ready:true,authenticated_live_verified:live,production_certified:production};
}
const m=Object.fromEntries(DOMAINS.map(d=>[d,{status:'PASS',type:'SYNTHETIC RUNTIME',evidence_id:`e-${d}`} ]));
assert.deepEqual(certify({...m,exact_sha:'sha'}),{repository_ready:true,authenticated_live_verified:false,production_certified:false});
assert.throws(()=>certify({...m,exact_sha:''}),/EXACT_SHA_REQUIRED/);
assert.throws(()=>certify({...m,exact_sha:'sha',e2e:{status:'BLOCKED',type:'SYNTHETIC RUNTIME',evidence_id:'e'}}),/E2E_NOT_PASS/);
assert.throws(()=>certify({...m,exact_sha:'sha',document:{status:'PASS',type:'SYNTHETIC RUNTIME'}}),/DOCUMENT_EVIDENCE_REQUIRED/);
const live=Object.fromEntries(DOMAINS.map(d=>[d,{status:'PASS',type:'AUTHENTICATED LIVE',evidence_id:`live-${d}`} ]));
assert.equal(certify({...live,exact_sha:'live'}).authenticated_live_verified,true);
console.log('final certification manifest: PASS');
