import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const buildScript = fs.readFileSync('scripts/build-with-provenance.mjs', 'utf8');
const netlifyProvenanceWriter = fs.readFileSync('scripts/write-netlify-runtime-provenance.mjs', 'utf8');
const netlifyHealth = fs.readFileSync('netlify/functions/health.mts', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.equal(pkg.scripts.build, 'node scripts/build-with-provenance.mjs');
assert.match(buildScript, /VITE_BUILD_SHA/);
assert.match(buildScript, /COMMIT_REF/);
assert.match(buildScript, /VERCEL_GIT_COMMIT_SHA/);
assert.ok(buildScript.includes("['rev-parse', 'HEAD']"));
assert.match(buildScript, /BUILD_SOURCE_SHA_INVALID/);
assert.match(netlifyProvenanceWriter, /import fs from ['"]node:fs['"]/);
assert.match(netlifyProvenanceWriter, /fs\.writeFileSync/);
assert.match(netlifyHealth, /import fs from ['"]node:fs['"]/);
assert.match(netlifyHealth, /fs\.readFileSync/);
assert.match(index, /name="aghbari-source-sha"/);
assert.match(index, /content="%VITE_BUILD_SHA%"/);

console.log('BUILD_PROVENANCE_CONTRACT_PASS');
