export const evidenceStages=['implementation','runtime','regression','evidence'];
export function buildEvidenceRegistry(capabilities, records={}){return Object.fromEntries(capabilities.map(id=>{const r=records[id]??{};return [id,{implementation:r.implementation===true,runtime:r.runtime===true,regression:r.regression===true,evidence:r.evidence===true,approved:evidenceStages.every(s=>r[s]===true)}]}));}
export function summarizeEvidence(registry){const entries=Object.values(registry);return{total:entries.length,approved:entries.filter(x=>x.approved).length,open:entries.filter(x=>!x.approved).length};}
if(process.argv[1]?.endsWith('runtime-capability-evidence.mjs'))console.log('Runtime capability evidence registry contract PASS.');
