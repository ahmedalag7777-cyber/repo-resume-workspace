import assert from 'node:assert/strict';
const points=[{date:'2026-01-01',units:10},{date:'2026-01-02',units:10},{date:'2026-01-03',units:20},{date:'2026-01-04',units:30}];
const avg=points.reduce((s,p)=>s+p.units,0)/points.length;
assert.equal(avg,17.5);
assert.equal(Math.max(...points.map(p=>p.units)),30);
const requested=100,fulfilled=70,lost=requested-fulfilled;
assert.equal(lost,30);
assert.equal(fulfilled/requested,.7);
console.log('seasonality + lost-sales fixture: PASS');
