import{strict as assert}from'node:assert';import{getCorpus}from'./golden-e2e-corpus.mjs';

const c=getCorpus();
const allowed=new Set(['PASS','REVIEW','QUARANTINE']);
const requiredGates=['extraction','fidelity','quality','schema','mapping','semantic','arithmetic','reconciliation','evidence'];
const requiredQuarantineSignals={
  'corrupt-extraction':['no_reliable_extractor'],
  'arithmetic-mismatch':['qty_price_total_mismatch'],
  'reconciliation-mismatch':['opening_debit_credit_balance'],
};

assert.equal(c.length,7,'golden corpus size must remain stable');
assert.equal(new Set(c.map(x=>x.id)).size,c.length,'golden corpus IDs must be unique');

// Deterministic + expected-disposition checks are executable invariants, not marker-only claims.
const deterministic = JSON.stringify(getCorpus()) === JSON.stringify(c);
assert.ok(deterministic,'golden corpus must be deterministic across repeated reads');
const expected = {
  'exchange-arabic':'PASS',
  'exchange-ocr':'REVIEW',
  'inventory-excel':'PASS',
  'unknown-layout':'REVIEW',
  'corrupt-extraction':'QUARANTINE',
  'arithmetic-mismatch':'QUARANTINE',
  'reconciliation-mismatch':'QUARANTINE'
};

assert.equal(Object.keys(expected).length,c.length,'every golden corpus case must have an explicit expected disposition');

for(const x of c){
  assert.ok(allowed.has(x.expect),`invalid corpus disposition: ${x.id}`);
  assert.deepEqual(x.requiredGates,requiredGates,`gate chain drift: ${x.id}`);
  assert.ok(Array.isArray(x.features)&&x.features.length>0,`fixture features missing: ${x.id}`);
}

const byId=Object.fromEntries(c.map(x=>[x.id,x]));
assert.deepEqual(new Set(Object.keys(expected)),new Set(c.map(x=>x.id)),'expected disposition map must cover exactly every corpus case');
for(const [id,expect] of Object.entries(expected)) assert.equal(byId[id].expect,expect,`expected disposition drift: ${id}`);

for(const x of c.filter(x=>x.expect==='QUARANTINE')){
  const signals=requiredQuarantineSignals[x.id];
  assert.ok(signals,`quarantine fixture missing explicit signal contract: ${x.id}`);
  assert.ok(signals.every(signal=>x.features.includes(signal)),`quarantine fixture lost its explicit hard-failure signal: ${x.id}`);
}

console.log('Golden E2E corpus tests PASS (identity + deterministic + complete expected-disposition coverage + gate-chain + quarantine-signal invariants).');
