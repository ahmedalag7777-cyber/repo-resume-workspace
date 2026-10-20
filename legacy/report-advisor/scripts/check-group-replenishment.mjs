import assert from 'node:assert/strict';
const demand=120, stock=300, target=10;
const coverage=stock/demand;
assert.equal(coverage,2.5);
const recommended=Math.ceil(demand*Math.max(0,target-coverage));
assert.equal(recommended,900);
const fill=700>0?600/700:1;
assert.ok(fill<0.9);
console.log('group replenishment fixture: PASS');
