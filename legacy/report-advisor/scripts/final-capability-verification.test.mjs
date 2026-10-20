import {strict as assert} from 'node:assert';
import {verifyCapabilities,verificationStages} from './final-capability-verification.mjs';
const good={capabilityA:Object.fromEntries(verificationStages.map(s=>[s,true]))};
assert.equal(verifyCapabilities(good).approved,true);
const bad={capabilityA:{...good.capabilityA,runtime:false}};const result=verifyCapabilities(bad);assert.equal(result.approved,false);assert.ok(result.gaps.includes('capabilityA.runtime'));
console.log('Final capability verification tests PASS.');
