import {strict as assert} from 'node:assert';
import {baseline} from './production-regression-baseline.mjs';
import {evaluateRelease} from './production-release-decision.mjs';
const good=Object.fromEntries(Object.entries(baseline).map(([id,b])=>[id,{expected:b.expected,stages:b.stages}]));
assert.equal(evaluateRelease(good).release,'approved');
const broken={...good};const id=Object.keys(broken)[0];broken[id]={expected:'broken',stages:[]};
const blocked=evaluateRelease(broken);assert.equal(blocked.release,'blocked');assert.ok(blocked.failures.length>=1);
const incomplete={...good};delete incomplete[Object.keys(incomplete)[1]];assert.equal(evaluateRelease(incomplete).release,'blocked');
console.log('Production release decision tests PASS.');
