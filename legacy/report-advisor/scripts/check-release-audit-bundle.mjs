import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['scripts/check-artifact-migration-provenance.mjs','scripts/check-security-provenance-certification.mjs','scripts/check-production-certification-boundary.mjs','scripts/check-production-evidence-failclosed.mjs'];
for(const f of required) if(!fs.existsSync(path.join(root,f))) throw new Error(`Audit bundle dependency missing: ${f}`);
const workflows=fs.readdirSync(path.join(root,'.github/workflows')).filter(f=>f.endsWith('.yml')||f.endsWith('.yaml'));
if(!workflows.some(f=>f.includes('certification'))) throw new Error('Certification workflow missing');
if(!workflows.some(f=>f.includes('production'))) throw new Error('Production workflow missing');
console.log('RELEASE AUDIT BUNDLE: PASS');
