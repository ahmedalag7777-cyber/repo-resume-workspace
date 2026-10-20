import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/file-engine/schema-intelligence.ts', import.meta.url), 'utf8');
const required = ['inferSchemaField', 'inferSchema', 'ambiguous', 'valueEvidence', 'SYNONYMS'];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Schema intelligence contract missing: ${token}`);
}
const requiredSynonyms = ['رقم الصنف', 'السعر', 'الكمية', 'رقم العميل', 'رقم الفاتورة'];
for (const token of requiredSynonyms) {
  if (!source.includes(token)) throw new Error(`Required Arabic synonym missing: ${token}`);
}
if (!source.includes('value-shape evidence')) throw new Error('Value-shape evidence is required');
if (!source.includes('best.confidence - second.confidence < 15')) throw new Error('Ambiguity threshold contract missing');
console.log('Schema intelligence contract: PASS');
