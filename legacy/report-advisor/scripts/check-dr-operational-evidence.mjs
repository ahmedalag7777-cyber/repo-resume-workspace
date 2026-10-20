import assert from 'node:assert/strict';

const DRILLS=['backup','restore','rollback'];
function verify(run){
  assert(run.exact_sha,'EXACT_SHA_REQUIRED');
  for(const d of DRILLS){assert(run[d]?.status==='PASS',`${d.toUpperCase()}_NOT_PASS`);assert(run[d]?.evidence_id,`${d.toUpperCase()}_EVIDENCE_ID_REQUIRED`);}
  assert(run.rpo_minutes>=0,'RPO_REQUIRED'); assert(run.rto_minutes>=0,'RTO_REQUIRED');
  return {dr_verified:true,rpo_minutes:run.rpo_minutes,rto_minutes:run.rto_minutes};
}
const synthetic={exact_sha:'sha',rpo_minutes:60,rto_minutes:120,...Object.fromEntries(DRILLS.map(d=>[d,{status:'PASS',evidence_id:`${d}-e`}]))};
assert.deepEqual(verify(synthetic),{dr_verified:true,rpo_minutes:60,rto_minutes:120});
assert.throws(()=>verify({...synthetic,exact_sha:''}),/EXACT_SHA_REQUIRED/);
assert.throws(()=>verify({...synthetic,restore:{status:'BLOCKED',evidence_id:'e'}}),/RESTORE_NOT_PASS/);
assert.throws(()=>verify({...synthetic,rollback:{status:'PASS'}}),/ROLLBACK_EVIDENCE_ID_REQUIRED/);
console.log('DR operational evidence contract: PASS');
