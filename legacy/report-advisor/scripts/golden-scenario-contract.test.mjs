import {strict as assert} from 'node:assert';
import {evaluateGoldenScenario,goldenScenarios} from './golden-scenario-contract.mjs';
const inventory=evaluateGoldenScenario('onyx_inventory',{fields:goldenScenarios.onyx_inventory.required,invariants:Object.fromEntries(goldenScenarios.onyx_inventory.invariants.map(x=>[x,true]))});
assert.equal(inventory.approved,true);
const exchange=evaluateGoldenScenario('exchange_statement',{fields:goldenScenarios.exchange_statement.required,invariants:{'debit-credit-exclusive':true,'balance-continuity':false,'currency-isolation':true}});
assert.equal(exchange.approved,false);assert.ok(exchange.failed.includes('balance-continuity'));
const unknown=evaluateGoldenScenario('unknown_schema',{fields:[],invariants:{'schema-discovery':true,'confidence-required':true,'quarantine-on-ambiguity':true}});assert.equal(unknown.approved,true);
assert.equal(evaluateGoldenScenario('missing',{}).approved,false);
console.log('Golden scenario contract tests PASS.');
