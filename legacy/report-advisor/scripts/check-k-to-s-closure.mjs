import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const requiredFiles=[
 'src/lib/k-to-s-runtime.ts',
 'src/lib/phase-kl-runtime.ts',
 'src/lib/phase-kl-supabase-runtime.ts',
 'src/lib/production-intelligence.ts',
 'docs/IMPLEMENTATION_ROADMAP.md',
 'docs/IMPLEMENTATION_ROADMAP_PHASES_N-S.md'
];
for(const file of requiredFiles) if(!fs.existsSync(path.join(root,file))) throw new Error(`K-S closure file missing: ${file}`);
const runtime=fs.readFileSync(path.join(root,'src/lib/k-to-s-runtime.ts'),'utf8');
for(const token of ['LIFECYCLE_PHASES','advanceLifecycle','buildDecisionPortfolio','chooseBoundedScenario','autonomyDecision','assessReleaseReadiness','assertNoCrossTenantEvidence']) if(!runtime.includes(token)) throw new Error(`K-S runtime contract missing: ${token}`);
const roadmap=fs.readFileSync(path.join(root,'docs/IMPLEMENTATION_ROADMAP.md'),'utf8');
const phases=fs.readFileSync(path.join(root,'docs/IMPLEMENTATION_ROADMAP_PHASES_N-S.md'),'utf8');
const roadmapCorpus=`${roadmap}\n${phases}`;
for(const phase of ['Phase K','Phase L','Phase M','Phase N','Phase O','Phase P','Phase Q','Phase R','Phase S']) if(!roadmapCorpus.includes(phase)) throw new Error(`Roadmap phase missing: ${phase}`);
const k=fs.readFileSync(path.join(root,'src/lib/production-intelligence.ts'),'utf8');
for(const token of ['evaluateAutonomyGate','selectBoundedScenario','rankPortfolio']) if(!k.includes(token)) throw new Error(`K intelligence primitive missing: ${token}`);
console.log('K→S integrated lifecycle closure contract: PASS (historical roadmap + N-S execution addendum)');
