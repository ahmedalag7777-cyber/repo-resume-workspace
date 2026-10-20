import {strict as assert} from 'node:assert';
import {buildEvidenceRegistry,summarizeEvidence} from './runtime-capability-evidence.mjs';
const ids=['schema.header-aliases','documents.pdf-ocr','financial.reconciliation'];
const registry=buildEvidenceRegistry(ids,{'schema.header-aliases':{implementation:true,runtime:true,regression:true,evidence:true},'documents.pdf-ocr':{implementation:true,runtime:true,regression:false,evidence:false}});
assert.equal(registry['schema.header-aliases'].approved,true);
assert.equal(registry['documents.pdf-ocr'].approved,false);
assert.deepEqual(summarizeEvidence(registry),{total:3,approved:1,open:2});
console.log('Runtime capability evidence tests PASS.');
