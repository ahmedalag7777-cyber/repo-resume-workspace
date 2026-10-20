import {strict as assert} from 'node:assert';
import {classifyGateFailure} from './check-production-failure-classification.mjs';
assert.equal(classifyGateFailure('typecheck').severity,'blocking');
assert.equal(classifyGateFailure('security').action,'fix-and-rerun');
assert.equal(classifyGateFailure('performance').severity,'warning');
assert.equal(classifyGateFailure('import').domain,'import');
console.log('Production failure classification tests PASS.');
