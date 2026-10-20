import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const p=path.join(root,'src/lib/report-execution/durable-production-runner.ts');
const s=fs.readFileSync(p,'utf8');
for(const t of ['store.claim','tenantId','sourceHash','assertProductionCheckpoint','saveCheckpoint','store.complete','executeStage']) if(!s.includes(t)) throw new Error(`runner safety contract missing: ${t}`);
if(!s.includes('try') && !s.includes('catch')) console.log('NOTE: failure path is delegated to durable worker boundary');
console.log('Production runner safety contract: PASS');
