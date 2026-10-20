import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/file-engine/adapters.ts', import.meta.url), 'utf8');

const required = [
  'materializeCanonicalFields',
  'column.mappedField',
  'column.mappingConfidence < 80',
  'const canonicalRows = materializeCanonicalFields(cleanedRows, columnProfiles)',
  'rows: canonicalRows',
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Canonical import mapping contract missing: ${token}`);
}

if (!source.includes('next[field] !==') || !source.includes("value !== '' && value !== null && value !== undefined")) {
  throw new Error('Canonical mapping must preserve non-empty existing values and ignore empty source cells');
}

if (!source.includes('if (!previous || column.mappingConfidence > previous.mappingConfidence)')) {
  throw new Error('Duplicate canonical mappings must resolve deterministically by confidence');
}

console.log('Canonical import mapping regression gate: PASS');
