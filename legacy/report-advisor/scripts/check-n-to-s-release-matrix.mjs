import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const exists=p=>fs.existsSync(path.join(root,p));
const required=[
 ['N','scripts/check-phase11-e2e-performance-closure.mjs'],
 ['O','scripts/check-performance-budget.mjs'],
 ['P','scripts/check-phase1-foundation-closure.mjs'],
 ['Q','scripts/check-a0-hardening-contract.mjs'],
 ['R','scripts/check-production-readiness.mjs'],
 ['S','scripts/check-operational-resilience-contract.mjs'],
];
const missing=required.filter(([,p])=>!exists(p));
if(missing.length) throw new Error(`N→S release matrix missing: ${missing.map(x=>x.join(':')).join(', ')}`);
const q=fs.readFileSync(path.join(root,'.github/workflows/quality.yml'),'utf8');
for(const t of ['test:k-to-s-deep-closure','test:phase-l-runtime','test:production-release-blockers']) if(!q.includes(t)) throw new Error(`quality missing ${t}`);
console.log('N→S release matrix contract: PASS');
