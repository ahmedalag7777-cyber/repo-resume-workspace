import fs from 'node:fs';

const source = fs.readFileSync('src/lib/report-execution/durable-production-runner.ts', 'utf8');
const findings = [];
if (!/input\.loadSourceSnapshot && !input\.request\.sourceSnapshotId\?\.trim\(\)/.test(source)) findings.push('loader boundary does not require a sourceSnapshotId');
if (!/sourceSnapshotId: input\.request\.sourceSnapshotId!/.test(source)) findings.push('sourceSnapshotId is not passed into the loader boundary');
if (!/sourceSnapshotId: input\.request\.sourceSnapshotId \?\? null/.test(source)) findings.push('completion evidence does not preserve sourceSnapshotId');
if (findings.length) { console.error('Report execution source snapshot identity: FAIL'); findings.forEach((finding) => console.error(`- ${finding}`)); process.exit(1); }
console.log('Report execution source snapshot identity: PASS');
