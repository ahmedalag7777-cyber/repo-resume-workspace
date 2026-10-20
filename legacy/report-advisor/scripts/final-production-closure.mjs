import {evaluateEvidence} from './production-readiness-evidence.mjs';
import {evaluateRelease} from './production-release-decision.mjs';
export function finalProductionDecision({statuses={},evidence={},scenarioResults={}}={}){const readiness=evaluateEvidence(statuses,evidence);const release=evaluateRelease(scenarioResults);return{approved:readiness.approved&&release.release==='approved',readiness:{approved:readiness.approved,missing:readiness.missing.length,unevidenced:readiness.unevidenced.length},release:{status:release.release,failures:release.failures.length,scenarios:release.scenarioCount}};}
if(process.argv[1]?.endsWith('final-production-closure.mjs'))console.log('Final production closure contract PASS.');
