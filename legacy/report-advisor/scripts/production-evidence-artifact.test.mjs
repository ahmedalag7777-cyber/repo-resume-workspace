import {strict as assert} from 'node:assert';
import {createEvidenceArtifact,verifyEvidenceArtifact} from './production-evidence-artifact.mjs';
const a=createEvidenceArtifact({capability:'documents.pdf-ocr',commit:'abc123',stage:'runtime',result:'PASS',details:{pages:3}});
assert.equal(verifyEvidenceArtifact(a),true);
const tampered={...a,result:'FAIL'};assert.equal(verifyEvidenceArtifact(tampered),false);
assert.throws(()=>createEvidenceArtifact({capability:'x'}));
console.log('Production evidence artifact tests PASS.');
