import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/import-pipeline/onyx-pro-adapter.ts', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../src/lib/import-pipeline/onyx-pro-header-catalog.ts', import.meta.url), 'utf8');

for (const token of ['adaptOnyxRows', 'isOnyxDataset', 'canonicalHeaders', 'unknownHeaders', 'confidence']) {
  if (!source.includes(token)) throw new Error(`Onyx adapter contract missing: ${token}`);
}
for (const token of ['رقم الصنف', 'اسم الصنف', 'المخزن', 'الكمية', 'السعر']) {
  if (!catalog.includes(token)) throw new Error(`Onyx catalog header missing: ${token}`);
}
if (!source.includes("if (!definition) continue")) throw new Error('Unknown Onyx fields must not be routed into canonical destinations');
if (!source.includes("if (value === '' || value === null || value === undefined) continue")) throw new Error('Empty Onyx cells must not overwrite canonical values');

console.log('Onyx Pro canonical adapter contract: PASS');
