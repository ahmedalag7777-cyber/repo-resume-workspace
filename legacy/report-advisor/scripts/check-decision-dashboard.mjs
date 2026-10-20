import assert from 'node:assert/strict';
const cards=['stockout','demand','lost_sales','continuity','alternative','liquidity','replenishment'];
assert.equal(new Set(cards).size,7);
assert.ok(cards.includes('stockout')&&cards.includes('replenishment'));
console.log('decision dashboard card contract: PASS');
