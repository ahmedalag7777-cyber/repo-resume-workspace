import {strict as assert} from 'node:assert';
import {reconcileLedger,validateExchangeRows} from './financial-reconciliation-contract.mjs';
assert.deepEqual(reconcileLedger({opening:100,debits:50,credits:20,closing:130}),{expected:130,actual:130,difference:0,balanced:true});
assert.equal(reconcileLedger({opening:100,debits:50,credits:20,closing:129}).balanced,false);
assert.equal(validateExchangeRows([{debit:10,credit:0},{debit:0,credit:20}]).valid,true);
const bad=validateExchangeRows([{debit:10,credit:5},{debit:'bad',credit:0}]);assert.equal(bad.valid,false);assert.equal(bad.errors.length,2);
console.log('Financial reconciliation contract tests PASS.');
