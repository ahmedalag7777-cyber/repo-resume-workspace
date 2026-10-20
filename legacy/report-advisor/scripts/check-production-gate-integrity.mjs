import fs from 'node:fs';
import process from 'node:process';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const scripts=pkg.scripts??{};
const required=['typecheck','build','test:contracts','test:production-readiness','test:report-truth','test:import-runtime-governance','test:tenant-security-contract','test:file-intelligence-security','test:production-scale'];
const missing=required.filter(name=>!scripts[name]);
if(missing.length){console.error(`Missing production gate scripts: ${missing.join(', ')}`);process.exit(1);}
const forbidden=['test:production-gate-integrity'];
for(const name of forbidden)if(!scripts[name]){};
console.log(`Production gate integrity PASS: ${required.length} required gates registered.`);
