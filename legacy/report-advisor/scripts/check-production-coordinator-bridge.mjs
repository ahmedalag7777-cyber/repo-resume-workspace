import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const file=path.join(root,'src/lib/report-execution/production-coordinator-bridge.ts');
if(!fs.existsSync(file)) throw new Error('production coordinator bridge missing');
const s=fs.readFileSync(file,'utf8');
for(const token of ['diffRows','consolidateRuntime','chooseScenario','prioritizeDecisions','canAutonomouslyExecute','assertProductionCheckpoint']) if(!s.includes(token)) throw new Error(`bridge contract missing: ${token}`);
console.log('Production coordinator bridge contract: PASS');
