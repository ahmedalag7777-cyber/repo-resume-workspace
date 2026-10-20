import fs from 'node:fs';
const s=fs.readFileSync('src/lib/decision/automationExecutor.ts','utf8');
for(const token of ['prepareAutomationAction','executeAutomationAction','decisionFingerprint','evidenceSnapshotId','idempotencyKey','EXTERNAL','requires explicit approval','BLOCKED']) if(!s.includes(token)) throw new Error(`automation contract missing ${token}`);
console.log('automation executor contract: PASS');
