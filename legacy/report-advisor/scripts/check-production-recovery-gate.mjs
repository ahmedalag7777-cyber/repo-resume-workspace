import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['scripts/check-recovery-readiness.mjs','scripts/check-release-gate-completeness.mjs','scripts/check-release-drift.mjs','scripts/check-evidence-freshness.mjs'];
for(const file of required){if(!fs.existsSync(path.join(root,file)))throw new Error(`Recovery release dependency missing: ${file}`);}
const workflowDir=path.join(root,'.github/workflows');
const workflows=fs.existsSync(workflowDir)?fs.readdirSync(workflowDir):[];
if(!workflows.some(f=>f.includes('recovery')))throw new Error('Recovery workflow missing');
if(!workflows.some(f=>f.includes('production-release-gate-chain')))throw new Error('Unified production release gate missing');
console.log('PRODUCTION RECOVERY GATE: PASS (static wiring verified)');
