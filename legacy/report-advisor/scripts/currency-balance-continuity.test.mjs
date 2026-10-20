import {strict as assert} from 'node:assert';
import {isolateCurrencies,checkBalanceContinuity} from './currency-balance-continuity.mjs';
const grouped=isolateCurrencies([{currency:'YER',amount:10},{currency:'USD',amount:2},{currency:'YER',amount:5}]);
assert.deepEqual(grouped.YER.length,2);assert.deepEqual(grouped.USD.length,1);
assert.equal(checkBalanceContinuity([{opening:0,closing:10},{opening:10,closing:20}]).valid,true);
const bad=checkBalanceContinuity([{opening:0,closing:10},{opening:9,closing:20}]);assert.equal(bad.valid,false);assert.equal(bad.errors[0].code,'OPENING_MISMATCH');
console.log('Currency and balance continuity tests PASS.');
