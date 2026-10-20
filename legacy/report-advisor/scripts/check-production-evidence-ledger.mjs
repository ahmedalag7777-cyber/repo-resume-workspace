import assert from 'node:assert/strict';

const TYPES = new Set(['STATIC','CI','SYNTHETIC RUNTIME','LIVE SQL','AUTHENTICATED LIVE','PRODUCTION']);
const DOMAINS = ['tenant','document','decision','security','performance','reliability','dr'];
function ledger(rows) {
  assert(rows?.exact_sha, 'EXACT_SHA_REQUIRED');
  for (const d of DOMAINS) {
    const r=rows[d]; assert(r?.status === 'PASS', `${d.toUpperCase()}_NOT_PASS`); assert(TYPES.has(r.type), `${d.toUpperCase()}_TYPE_INVALID`); assert(r.evidence_id, `${d.toUpperCase()}_EVIDENCE_ID_REQUIRED`);
  }
  const live=DOMAINS.every(d=>['AUTHENTICATED LIVE','PRODUCTION'].includes(rows[d].type));
  const production=DOMAINS.every(d=>rows[d].type==='PRODUCTION');
  return {exact_sha:rows.exact_sha, repository_verified:true, live_verified:live, production_certified:production};
}
const rows=Object.fromEntries(DOMAINS.map(d=>[d,{status:'PASS',type:'SYNTHETIC RUNTIME',evidence_id:`e-${d}`} ]));
assert.deepEqual(ledger({...rows,exact_sha:'sha'}),{exact_sha:'sha',repository_verified:true,live_verified:false,production_certified:false});
assert.throws(()=>ledger({...rows,exact_sha:''}),/EXACT_SHA_REQUIRED/);
assert.throws(()=>ledger({...rows,exact_sha:'sha',dr:{status:'PASS',type:'PRODUCTION'}}),/DR_EVIDENCE_ID_REQUIRED/);
assert.throws(()=>ledger({...rows,exact_sha:'sha',security:{status:'BLOCKED',type:'SYNTHETIC RUNTIME',evidence_id:'e'}}),/SECURITY_NOT_PASS/);
assert.throws(()=>ledger({...rows,exact_sha:'sha',performance:{status:'PASS',type:'UNKNOWN',evidence_id:'e'}}),/PERFORMANCE_TYPE_INVALID/);
console.log('production evidence ledger: PASS');
