import {strict as assert} from 'node:assert';
import {productionReadiness} from './production-readiness-manifest.mjs';
import {baseline} from './production-regression-baseline.mjs';
import {finalProductionDecision} from './final-production-closure.mjs';
const statuses={};const evidence={};for(const [d,checks] of Object.entries(productionReadiness))for(const c of checks){const k=`${d}.${c}`;statuses[k]=true;evidence[k]={source:'automated-test',result:'PASS'};}
const scenarioResults=Object.fromEntries(Object.entries(baseline).map(([id,b])=>[id,{expected:b.expected,stages:b.stages}]));
assert.equal(finalProductionDecision({statuses,evidence,scenarioResults}).approved,true);
const broken={...scenarioResults};delete broken[Object.keys(broken)[0]];assert.equal(finalProductionDecision({statuses,evidence,scenarioResults:broken}).approved,false);
console.log('Final production closure tests PASS.');
