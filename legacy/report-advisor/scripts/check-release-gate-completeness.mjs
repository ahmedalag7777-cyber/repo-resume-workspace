import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const gates=[
 'scripts/check-release-manifest-integrity.mjs',
 'scripts/check-release-drift.mjs',
 'scripts/check-evidence-freshness.mjs',
 'scripts/check-release-artifact-integrity.mjs',
 'scripts/check-rollback-decision-contract.mjs',
 'scripts/check-security-provenance-certification.mjs',
 'scripts/check-production-certification-boundary.mjs'
];
for(const g of gates) if(!fs.existsSync(path.join(root,g))) throw new Error(`Release gate missing: ${g}`);
console.log(`RELEASE GATE COMPLETENESS: PASS (${gates.length} gates)`);
