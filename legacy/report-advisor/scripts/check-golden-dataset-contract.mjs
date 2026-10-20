import fs from 'node:fs';
const source = fs.readFileSync('src/lib/document-intelligence/golden-dataset.ts','utf8');
for (const token of ['ARABIC_ENGLISH','SCANNED','RANDOM_SCHEMA','NO_HEADER','COMPLEX_TABLE','INVOICE','ONYX','WIDE_30_PLUS','accuracy >= 0.95']) if (!source.includes(token)) throw new Error(`Golden dataset contract missing ${token}`);
console.log('Golden dataset contract: PASS');
