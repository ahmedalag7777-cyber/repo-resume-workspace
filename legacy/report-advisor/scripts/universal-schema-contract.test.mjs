import {strict as assert} from 'node:assert';
import {detectSchema,shouldQuarantine} from './universal-schema-contract.mjs';
const r=detectSchema(['رقم الصنف','Item Name','warehouse','مدين','دائن','الرصيد','unknown']);
assert.equal(r.mapping['رقم الصنف'],'رقم الصنف');assert.equal(r.mapping['Item Name'],'اسم الصنف');assert.equal(r.mapping.warehouse,'المخزن');assert.equal(r.mapping['مدين'],'مدين');assert.equal(r.unmatched.length,1);assert.ok(r.confidence>0.8);assert.equal(shouldQuarantine(r),false);
const low=detectSchema(['foo','bar','baz']);assert.equal(low.confidence,0);assert.equal(shouldQuarantine(low),true);
console.log('Universal schema contract tests PASS.');
