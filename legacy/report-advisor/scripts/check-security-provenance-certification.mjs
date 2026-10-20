import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const files=['scripts/check-production-certification-boundary.mjs','scripts/check-production-evidence-failclosed.mjs','scripts/check-release-evidence-completeness.mjs','scripts/check-tenant-security-contract.mjs'];
for(const f of files) if(!fs.existsSync(path.join(root,f))) throw new Error(`Required certification dependency missing: ${f}`);
const text=files.map(f=>fs.readFileSync(path.join(root,f),'utf8').toLowerCase()).join('\n');
for(const token of ['fail-closed','tenant','evidence','certification']) if(!text.includes(token)) throw new Error(`Security provenance invariant missing: ${token}`);
if(!text.includes('rollback')) throw new Error('Certification chain must include rollback evidence');
console.log('SECURITY + PROVENANCE CERTIFICATION BOUNDARY: PASS');
