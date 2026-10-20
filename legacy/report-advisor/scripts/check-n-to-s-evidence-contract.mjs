import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const files={
 N:['scripts/check-phase11-e2e-performance-closure.mjs','src/lib/report-execution'],
 O:['scripts/check-performance-budget.mjs'],
 P:['src/App.tsx','src/main.tsx'],
 Q:['src/lib/file-engine'],
 R:['scripts/check-production-readiness.mjs'],
 S:['scripts/check-operational-resilience-contract.mjs'],
};
for(const [phase,paths] of Object.entries(files)) for(const p of paths) if(!fs.existsSync(path.join(root,p))) throw new Error(`${phase}: missing evidence path ${p}`);
const q=fs.readFileSync(path.join(root,'.github/workflows/quality.yml'),'utf8');
if(!q.includes('test:k-to-s-deep-closure')) throw new Error('K/S closure gate not wired');
if(!q.includes('test:production-release-blockers')) throw new Error('production release-blocker gate not wired');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for(const s of ['typecheck','lint','build']) if(!pkg.scripts?.[s]) throw new Error(`missing core script ${s}`);
console.log('N→S evidence contract: PASS');
