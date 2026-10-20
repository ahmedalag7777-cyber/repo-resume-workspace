import assert from 'node:assert/strict';

const EXTERNAL = new Set(['AUTHENTICATED LIVE','PRODUCTION']);
const DOMAINS = ['tenant','document','decision','security','performance','reliability','dr'];
function evaluate(e) {
  assert(e?.exact_sha, 'EXACT_SHA_REQUIRED');
  for (const d of DOMAINS) assert(e[d]?.status === 'PASS', `${d.toUpperCase()}_NOT_PASS`);
  const live = DOMAINS.every(d => EXTERNAL.has(e[d].type));
  const production = DOMAINS.every(d => e[d].type === 'PRODUCTION');
  return { repository_ready:true, live_verified:live, production_certified:production };
}
const base = Object.fromEntries(DOMAINS.map(d => [d,{status:'PASS',type:'SYNTHETIC RUNTIME'}]));
assert.deepEqual(evaluate({...base,exact_sha:'sha'}),{repository_ready:true,live_verified:false,production_certified:false});
assert.throws(()=>evaluate({...base,exact_sha:'',}),/EXACT_SHA_REQUIRED/);
assert.throws(()=>evaluate({...base,exact_sha:'sha',dr:{status:'BLOCKED',type:'SYNTHETIC RUNTIME'}}),/DR_NOT_PASS/);
const live={...Object.fromEntries(DOMAINS.map(d=>[d,{status:'PASS',type:'AUTHENTICATED LIVE'}])),exact_sha:'live-sha'};
assert.equal(evaluate(live).live_verified,true); assert.equal(evaluate(live).production_certified,false);
console.log('final release readiness gate: PASS');
