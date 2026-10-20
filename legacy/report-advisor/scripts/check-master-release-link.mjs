import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const wf=fs.readFileSync(path.join(root,'.github/workflows/master-production-verification.yml'),'utf8');
for(const gate of ['check-master-production-verification.mjs','check-release-evidence-completeness.mjs','check-autonomy-safety-chain.mjs','check-final-safety-invariants.mjs']) if(!wf.includes(gate)) throw new Error(`Master workflow missing release gate: ${gate}`);
const packageText=fs.readFileSync(path.join(root,'package.json'),'utf8');
for(const gate of ['production-release-blockers','production-certification-contract','phase-k-runtime','phase-l-runtime']) if(!packageText.includes(gate)) throw new Error(`Master package missing: ${gate}`);
console.log('Master release link: PASS');
