import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const candidates=[];
for(const file of ['scripts/generate-release-manifest.mjs','supabase/migrations/20260825150000_phase_m_certification_bundle.sql','src/lib/production/productionCertification.ts','scripts/check-production-certification-contract.mjs','scripts/check-production-release-blockers.mjs']) if(fs.existsSync(path.join(root,file))) candidates.push(fs.readFileSync(path.join(root,file),'utf8').toLowerCase());
const text=candidates.join('\n');
const groups=[
 ['source identity',['sourcesha','source_sha']],
 ['migration fingerprint',['migrationfingerprint','migrations_fingerprint']],
 ['dependency fingerprint',['dependencyfingerprint','dependency_fingerprint','dependency_lock_fingerprint']],
 ['artifact evidence',['artifact_integrity_passed','artifact_fingerprint']],
 ['certification evidence',['production_certification_evidence_keys','certification']],
 ['canary evidence',['canary','tenant_isolation_passed']],
 ['rollback evidence',['rollback','rollback_passed']],
 ['trust evidence',['trust','security_audit_passed']],
];
for(const [label,tokens] of groups) if(!tokens.some(token=>text.includes(token))) throw new Error(`Release evidence completeness missing ${label}`);
const certificationSource=fs.readFileSync(path.join(root,'src/lib/production/productionCertification.ts'),'utf8');
if(!certificationSource.includes('certificationBlockers.length === 0') || !certificationSource.includes('evidenceComplete')) throw new Error('Release certification must remain fail-closed');
console.log('Release evidence completeness: PASS');
