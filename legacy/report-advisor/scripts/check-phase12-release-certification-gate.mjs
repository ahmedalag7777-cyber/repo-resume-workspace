import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = [
  'vercel.json',
  'package.json',
  'scripts/check-production-release-blockers.mjs',
  'scripts/check-production-certification-contract.mjs',
  'src/lib/production/productionCertification.ts',
];
for (const file of files) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing release surface: ${file}`);

const vercelSource = read('vercel.json');
const pkg = JSON.parse(read('package.json'));
const blockers = read('scripts/check-production-release-blockers.mjs');
const certificationContract = read('scripts/check-production-certification-contract.mjs');
const productionCertification = read('src/lib/production/productionCertification.ts');

const assertSpaFallback = (config) => {
  const routes = Array.isArray(config.routes) ? config.routes : [];
  const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
  const filesystemIndex = routes.findIndex((route) => route && route.handle === 'filesystem');
  const fallbackIndex = routes.findIndex((route) => route && route.dest === '/index.html' && typeof route.src === 'string' && route.src.length > 0);
  const routeFallback = filesystemIndex >= 0 && fallbackIndex > filesystemIndex;
  const rewriteFallback = rewrites.some((rewrite) => rewrite && rewrite.destination === '/index.html' && typeof rewrite.source === 'string' && rewrite.source.length > 0);
  if (!routeFallback && !rewriteFallback) throw new Error('Release gate missing ordered SPA fallback');
};

let vercel;
try {
  vercel = JSON.parse(vercelSource);
} catch (error) {
  throw new Error(`Release gate invalid vercel.json: ${error.message}`);
}
assertSpaFallback(vercel);

for (const token of ['build', 'lint', 'typecheck']) {
  if (typeof pkg.scripts?.[token] !== 'string' || !pkg.scripts[token].trim()) {
    throw new Error(`Release gate missing package script: ${token}`);
  }
}
for (const token of ['artifact-integrity', 'idempotencyKey', 'requiresApproval', 'MISSING_TENANT']) {
  if (!blockers.includes(token)) throw new Error(`Release blocker coverage missing ${token}`);
}

// Bind Phase 12 to the canonical production certification source itself,
// not to the checker that merely validates it.
const evidenceKeysMatch = productionCertification.match(
  /PRODUCTION_CERTIFICATION_EVIDENCE_KEYS\s*:[^=]+?=\s*\[([\s\S]*?)\];/,
);
if (!evidenceKeysMatch) throw new Error('Certification binding missing canonical evidence declaration');
const canonicalEvidenceKeys = [...evidenceKeysMatch[1].matchAll(/['\"]([a-z_]+)['\"]/g)].map((match) => match[1]);
for (const key of ['tenant', 'backup', 'rollback', 'artifact', 'security']) {
  if (!canonicalEvidenceKeys.includes(key)) throw new Error(`Certification binding missing canonical evidence invariant: ${key}`);
}
if (JSON.stringify(canonicalEvidenceKeys) !== JSON.stringify(['tenant', 'backup', 'rollback', 'artifact', 'security'])) {
  throw new Error(`Certification binding canonical evidence order drifted: ${JSON.stringify(canonicalEvidenceKeys)}`);
}
if (!certificationContract.includes('PRODUCTION_CERTIFICATION_EVIDENCE_KEYS')) throw new Error('Certification contract must validate the same canonical evidence declaration');

if (/PRODUCTION CERTIFIED\s*=\s*YES/i.test(productionCertification)) throw new Error('Release gate rejects fabricated production certification');

// Test-of-test: executable canonical route must be recognized; decoys and
// misordered routes must be rejected as non-functional release evidence.
const canonicalRouteConfig = { routes: [{ handle: 'filesystem' }, { src: '/.*', dest: '/index.html' }] };
assertSpaFallback(canonicalRouteConfig);
for (const decoyConfig of [
  { routes: [{ handle: 'filesystem' }, { src: '/.*', dest: '// "dest": "/index.html"' }] },
  { routes: [{ src: '/.*', dest: '/index.html' }, { handle: 'filesystem' }] },
]) {
  let rejected = false;
  try {
    assertSpaFallback(decoyConfig);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error('Test-of-test accepted non-functional SPA route evidence');
}

console.log('Phase 12 release certification gate: PASS (repository-level; deployment evidence remains external)');