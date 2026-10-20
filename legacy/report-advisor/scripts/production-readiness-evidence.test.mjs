import {strict as assert} from 'node:assert';
import {productionReadiness} from './production-readiness-manifest.mjs';
import {evaluateEvidence} from './production-readiness-evidence.mjs';
const statuses={};const meta={};for(const [d,checks] of Object.entries(productionReadiness))for(const c of checks){const k=`${d}.${c}`;statuses[k]=true;meta[k]={source:'automated-test',result:'PASS'};}
assert.equal(evaluateEvidence(statuses,meta).approved,true);
delete meta['files.pdf-ocr'];assert.equal(evaluateEvidence(statuses,meta).approved,false);assert.ok(evaluateEvidence(statuses,meta).unevidenced.some(x=>x.key==='files.pdf-ocr'));
console.log('Certification evidence-backed readiness tests PASS.');
