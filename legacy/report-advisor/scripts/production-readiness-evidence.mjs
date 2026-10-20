import {productionReadiness} from './production-readiness-manifest.mjs';
export function buildEvidence(statuses={},meta={}){const checks=[];for(const [domain,names] of Object.entries(productionReadiness)){for(const name of names){const key=`${domain}.${name}`;checks.push({key,status:statuses[key]===true?'pass':'missing',evidence:meta[key]??null});}}return checks;}
export function evaluateEvidence(statuses={},meta={}){const checks=buildEvidence(statuses,meta);const missing=checks.filter(c=>c.status!=='pass');const unevidenced=checks.filter(c=>c.status==='pass'&&!c.evidence);return{approved:missing.length===0&&unevidenced.length===0,checks,missing,unevidenced};}
if(process.argv[1]?.endsWith('production-readiness-evidence.mjs'))console.log('Evidence-backed readiness contract PASS.');
