import {strict as assert} from 'node:assert';
import {productionReadiness} from './production-readiness-manifest.mjs';
import {evaluateReadiness} from './production-readiness-closure.mjs';
const all={};for(const [d,checks] of Object.entries(productionReadiness))for(const c of checks)all[`${d}.${c}`]=true;
assert.equal(evaluateReadiness(all).approved,true);
const broken={...all};delete broken['files.pdf-ocr'];const blocked=evaluateReadiness(broken);assert.equal(blocked.approved,false);assert.ok(blocked.incomplete.includes('files.pdf-ocr'));
console.log('Production readiness closure tests PASS.');
