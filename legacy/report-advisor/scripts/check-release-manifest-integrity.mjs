import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const p=path.join(root,'release-manifest.json');
if(!fs.existsSync(p)) throw new Error('Release manifest missing');
const m=JSON.parse(fs.readFileSync(p,'utf8'));
for(const k of ['schemaVersion','sourceSha','packageVersion','dependencyFingerprint','migrationFingerprint']) if(!m[k]) throw new Error(`Release manifest missing: ${k}`);
if(process.env.CI){
  const expectedSha=process.env.CERTIFICATION_SHA||process.env.GITHUB_SHA;
  if(!expectedSha) throw new Error('Missing certification/source SHA');
  const actualSha=process.env.GITHUB_SHA;
  if(m.sourceSha!==expectedSha) throw new Error('Release manifest source SHA mismatch');
  if(actualSha && actualSha!==expectedSha && process.env.GITHUB_EVENT_NAME!=='pull_request') throw new Error('Release manifest source SHA mismatch');
}
if(!/^[a-f0-9]{64}$/.test(m.dependencyFingerprint)||!/^[a-f0-9]{64}$/.test(m.migrationFingerprint)) throw new Error('Invalid release fingerprints');
console.log('RELEASE MANIFEST INTEGRITY: PASS');
