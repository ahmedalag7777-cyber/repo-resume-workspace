import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const scripts=pkg.scripts ?? {};
const required={
 N:['test:report-execution-e2e-contract','test:operational-file-pipeline','test:production-gate-runtime'],
 O:['test:production-scale','test:concurrent-analysis','test:bounded-concurrency','perf:budget'],
 P:['test:contracts','test:decision-dashboard','test:inventory-intelligence-ui'],
 Q:['test:file-engine-regressions','test:schema-intelligence','test:document-intelligence-hardening','test:report-truth'],
 R:['test:production-readiness','test:production-release-blockers','test:production-certification-contract'],
 S:['test:operational-resilience','test:release-resilience-manifest','test:continuous-trust'],
};
for(const [phase,names] of Object.entries(required)) for(const name of names) if(!scripts[name]) throw new Error(`${phase}: missing real gate ${name}`);
const files=[
 'src/lib/report-execution/production-coordinator-bridge.ts',
 'src/lib/report-execution/durable-production-runner.ts',
 'src/lib/report-execution/production-run-policy.ts',
 'src/lib/phase-kl-runtime.ts',
 'src/lib/phase-kl-supabase-runtime.ts',
 'scripts/check-production-readiness.mjs'
];
for(const file of files) if(!fs.existsSync(path.join(root,file))) throw new Error(`missing runtime evidence: ${file}`);
console.log('N→S real-gates matrix: PASS');
for(const [phase,names] of Object.entries(required)) console.log(`${phase}: ${names.length} gates bound`);
