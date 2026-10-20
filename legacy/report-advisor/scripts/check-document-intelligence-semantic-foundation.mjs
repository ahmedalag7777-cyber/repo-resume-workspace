import fs from 'node:fs';

const required = [
  'src/lib/document-intelligence/schema-discovery.ts',
  'src/lib/document-intelligence/normalization.ts',
  'src/lib/document-intelligence/validation.ts',
  'src/lib/document-intelligence/routing.ts',
  'src/lib/document-intelligence/index.ts',
  'docs/DOCUMENT_INTELLIGENCE_ENGINE_REQUIREMENTS.md',
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing document-intelligence foundation file: ${file}`);
}

const schema = fs.readFileSync(required[0], 'utf8');
const normalization = fs.readFileSync(required[1], 'utf8');
const validation = fs.readFileSync(required[2], 'utf8');
const routing = fs.readFileSync(required[3], 'utf8');

for (const token of ['ColumnProfile', 'candidateMeaning', 'DEFAULT_SEMANTIC_DICTIONARY', 'profileColumns']) {
  if (!schema.toLowerCase().includes(token.toLowerCase())) throw new Error(`Schema discovery contract missing: ${token}`);
}
for (const token of ['normalizeArabicText', 'parseNumber', 'original']) {
  if (!normalization.toLowerCase().includes(token.toLowerCase())) throw new Error(`Normalization contract missing: ${token}`);
}
if (!/(percentage|percent|%|٪)/i.test(normalization)) {
  throw new Error('Normalization contract missing: percentage handling');
}
for (const token of ['combineEvidence', 'reconcileNumbers', 'validateLineMath', 'classifyConfidence']) {
  if (!validation.includes(token)) throw new Error(`Validation contract missing: ${token}`);
}
for (const token of ['routeCanonicalField', 'UNMAPPED', 'quarantine']) {
  if (!routing.includes(token)) throw new Error(`Routing contract missing: ${token}`);
}

console.log('Document intelligence semantic foundation contract: PASS');
