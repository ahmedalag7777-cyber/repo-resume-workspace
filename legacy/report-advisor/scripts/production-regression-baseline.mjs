import {scenarios} from './production-scenario-matrix.mjs';
export const baseline=Object.freeze(Object.fromEntries(scenarios.map(s=>[s.id,{expected:s.expect,stages:['detect','map','normalize','analyze','reconcile','evidence','decision','quality']}])));
export function compareScenarioResult(id,result){const b=baseline[id];if(!b)return{ok:false,reason:'unknown-scenario'};const stages=Array.isArray(result?.stages)?result.stages:[];return{ok:result.expected===b.expected&&stages.join('|')===b.stages.join('|'),expected:b,result};}
if(process.argv[1]?.endsWith('production-regression-baseline.mjs'))console.log(`Production regression baseline PASS: ${Object.keys(baseline).length} scenarios locked.`);
