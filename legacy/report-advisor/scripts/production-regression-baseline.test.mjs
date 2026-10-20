import {strict as assert} from 'node:assert';
import {baseline,compareScenarioResult} from './production-regression-baseline.mjs';
assert.ok(Object.keys(baseline).length>=12);
const first=Object.keys(baseline)[0];
assert.equal(compareScenarioResult(first,{expected:baseline[first].expected,stages:baseline[first].stages}).ok,true);
assert.equal(compareScenarioResult(first,{expected:'unexpected',stages:baseline[first].stages}).ok,false);
assert.equal(compareScenarioResult('missing-scenario',{}).ok,false);
console.log('Production regression baseline tests PASS.');
