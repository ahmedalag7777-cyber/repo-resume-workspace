import assert from 'node:assert/strict';
import { parseNumber, normalizeArabicText } from '../src/lib/document-intelligence/normalization.ts';

const cases = [
  ['25%', 0.25],
  ['٢٥٪', 0.25],
  ['-12.5%', -0.125],
  ['١٢٫٥٪', 0.125],
];

for (const [input, expected] of cases) {
  const result = parseNumber(input);
  assert.equal(result.kind, 'number', `expected numeric result for ${input}`);
  assert.equal(result.value, expected, `unexpected normalized value for ${input}`);
}

assert.equal(normalizeArabicText('إختبار ١٢'), 'اختبار 12');
console.log('document intelligence normalization regression: PASS');
