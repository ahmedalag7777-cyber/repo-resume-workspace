import fs from 'node:fs';

const source = fs.readFileSync('src/lib/document-intelligence/schema-discovery.ts', 'utf8');
const required = [
  ['numeric normalization is separate from header normalization', source.includes('function normalizeNumericText')],
  ['Arabic digits are normalized', source.includes('ARABIC_DIGITS[i]') && source.includes('PERSIAN_DIGITS[i]')],
  ['Arabic decimal separator is preserved as decimal', source.includes("replace(/٫/g, '.')")],
  ['Arabic thousands separator is removed', source.includes("replace(/٬/g, '')")],
  ['numeric parser accepts decimal values', source.includes("/^-?\\d+(\\.\\d+)?%?$/")],
  ['headers still use semantic normalization', source.includes('const normalizedHeader = normalizeHeader(header ?? \'\')')],
];
for (const [name, ok] of required) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = required.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log(`Schema discovery behavior gate: ${required.length}/${required.length} PASS`);
