import assert from 'node:assert/strict';
const rows=[{customerId:'c1',sku:'A',requested:100,fulfilled:40},{customerId:'c1',sku:'B',requested:50,fulfilled:0},{customerId:'c2',sku:'A',requested:100,fulfilled:100}];
const c1=rows.filter(r=>r.customerId==='c1');const requested=c1.reduce((s,r)=>s+r.requested,0);const fulfilled=c1.reduce((s,r)=>s+Math.min(r.requested,r.fulfilled),0);const lost=requested-fulfilled;assert.equal(requested,150);assert.equal(fulfilled,40);assert.equal(lost,110);assert.ok(1-fulfilled/requested>0.7);console.log('customer continuity fixture: PASS');
