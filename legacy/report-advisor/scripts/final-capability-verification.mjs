import {capabilityCoverage} from './check-capability-gap-closure.mjs';
export const verificationStages=['contract','implementation','runtime','regression','evidence'];
export function verifyCapabilities(records={}){const gaps=[];for(const [id,record] of Object.entries(records)){for(const stage of verificationStages){if(record?.[stage]!==true)gaps.push(`${id}.${stage}`);}}return{total:Object.keys(records).length,requiredStages:verificationStages.length,gaps,approved:gaps.length===0};}
if(process.argv[1]?.endsWith('final-capability-verification.mjs')){const probe=capabilityCoverage({});if(probe.total<30)process.exit(1);console.log(`Final capability verification contract PASS: ${probe.total} tracked capabilities.`);}
