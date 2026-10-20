import fs from 'node:fs';

const source = fs.readFileSync('src/lib/report-execution/verified-production-runner.ts', 'utf8');
const findings = [];
for (const token of ['sourceSnapshotId: string', 'loadSourceSnapshot:', 'requires sourceSnapshotId', 'runDurableProductionLifecycle']) if (!source.includes(token)) findings.push(`missing production runner invariant: ${token}`);
if (findings.length) { console.error('Verified production runner contract: FAIL'); findings.forEach((finding) => console.error(`- ${finding}`)); process.exit(1); }
console.log('Verified production runner contract: PASS');
