import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
const required=[
 ['K','src/lib/production-intelligence.ts',['evaluateAutonomyGate','selectBoundedScenario','rankPortfolio','calibrateConfidence']],
 ['K/L','src/lib/k-to-s-runtime.ts',['advanceLifecycle','buildDecisionPortfolio','chooseBoundedScenario','autonomyDecision','assessReleaseReadiness','assertNoCrossTenantEvidence']],
 ['K/L persistence','src/lib/phase-kl-supabase-runtime.ts',['recordHealth','recordEvidenceEdge','autonomyGate']],
 ['Execution','src/lib/report-execution/checkpoint.ts',['assertValidTransition','createInitialCheckpoint']],
 ['Roadmap','docs/IMPLEMENTATION_ROADMAP.md',['Phase K','Phase L','Phase M']],
 ['Roadmap N-S addendum','docs/IMPLEMENTATION_ROADMAP_PHASES_N-S.md',['Phase N','Phase O','Phase P','Phase Q','Phase R','Phase S']],
 ['P0 certification matrix','docs/P0_RUNTIME_CERTIFICATION_MATRIX.md',['Tenant isolation / RLS','Storage / signed URLs','Realtime authorization','AI retrieval isolation','Backup / restore','Migration / parity','Artifact provenance','Worker recovery','SLO / rollback','Security / secrets','Stabilization telemetry','Final certification']]
];
for(const [name,file,tokens] of required){if(!exists(file)) throw new Error(`${name}: missing ${file}`);const s=read(file);for(const t of tokens)if(!s.includes(t))throw new Error(`${name}: missing ${t}`);}
const roadmap=`${read('docs/IMPLEMENTATION_ROADMAP.md')}\n${read('docs/IMPLEMENTATION_ROADMAP_PHASES_N-S.md')}`;
for(const phase of ['Phase K','Phase L','Phase M','Phase N','Phase O','Phase P','Phase Q','Phase R','Phase S']) if(!roadmap.includes(phase)) throw new Error(`roadmap phase missing: ${phase}`);
const quality=read('.github/workflows/quality.yml');
for(const t of ['test:k-to-s-closure','test:phase-k-runtime','test:phase-l-resumable-execution','test:phase-m-certification'])if(!quality.includes(t))throw new Error(`quality gate missing: ${t}`);
const certificationMigration='supabase/migrations/20260825150000_phase_m_certification_bundle.sql';
if(!exists(certificationMigration)) throw new Error(`M certification migration missing: ${certificationMigration}`);
const certification=read(certificationMigration);
if(!certification.includes('can_release_production_certification')) throw new Error('M certification release predicate missing');
console.log('Deep K→S closure matrix: PASS (canonical runtime + roadmap/addendum + P0 certification matrix + canonical Phase M migration; live production certification remains fail-closed).');
