import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['release-manifest.json','scripts/check-release-drift.mjs','scripts/check-release-decision-provenance.mjs','scripts/check-release-artifact-integrity.mjs'];
for(const f of required) if(!fs.existsSync(path.join(root,f))) throw new Error(`Evidence snapshot dependency missing: ${f}`);
const m=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
for(const k of ['sourceSha','dependencyFingerprint','migrationFingerprint','packageVersion']) if(!m[k]) throw new Error(`Evidence snapshot missing ${k}`);
console.log(JSON.stringify({contract:'release-evidence-snapshot',sourceSha:m.sourceSha,packageVersion:m.packageVersion,dependencyFingerprint:m.dependencyFingerprint,migrationFingerprint:m.migrationFingerprint}));
