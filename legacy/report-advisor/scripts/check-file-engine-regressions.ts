import {
  isPhone,
  normalizeArabicDigits,
  normalizeArabicText,
  normalizeHeader,
  parseCurrency,
  parseDate,
  parseNumber,
} from '../src/lib/file-engine/normalizer.ts';
import { cleanValue, detectColumnDataType } from '../src/lib/file-engine/data-types.ts';
import { detectHeaderRow, rowsFromDetectedHeader } from '../src/lib/file-engine/header-detection.ts';
import { parseCSV } from '../src/lib/file-engine/adapters.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`File-engine regression failed: ${message}`);
}

assert(normalizeArabicDigits('١٢٣٤٥') === '12345', 'Arabic-Indic digits must normalize');
assert(normalizeArabicText('آثارٌ  تجارية') === 'اثار تجاريه', 'Arabic text normalization must be deterministic');
assert(normalizeHeader('  رَقَمُ   الصَّنْف  ') === 'رقم الصنف', 'header normalization must remove diacritics and spacing');
assert(normalizeHeader('اﻹجمالي') === 'الاجمالي', 'Arabic presentation forms must normalize before synonym mapping');

assert(parseNumber('١٬٢٣٤٫٥٠') === 1234.5, 'Arabic thousands/decimal separators');
assert(parseNumber('1,234.50') === 1234.5, 'Western thousands/decimal separators');
assert(parseNumber('1.234,50') === 1234.5, 'European thousands/decimal separators');
assert(parseNumber('1,23') === 1.23, 'short comma decimal');
assert(parseNumber('2,275,00') === 2275, 'legacy comma-decimal values must normalize without 100x inflation');
assert(parseNumber('٣٬٢٥٠٬٠٠') === 3250, 'Arabic grouped decimal separators must normalize');
assert(parseCurrency('١٬٢٥٠ ريال') === 1250, 'currency symbols/text must not corrupt value');
assert(parseNumber('١٢٣') === 123, 'Arabic numeric string');
assert(parseNumber('not-a-number') === null, 'invalid numeric input must be null');

assert(parseDate('١٥/٠٨/٢٠٢٦') === '2026-08-15', 'Arabic date digits');
assert(parseDate('2026-8-5') === '2026-08-05', 'ISO date padding');
assert(isPhone('٧٧١٢٣٤٥٦٧٨'), 'Arabic phone digits');

assert(detectColumnDataType(['١٠', '٢٠', '٣٠'], 'الكمية') === 'integer', 'Arabic quantity detection');
assert(detectColumnDataType(['١٬٢٥٠ ريال', '٢٬٥٠٠ ريال'], 'السعر') === 'currency', 'Arabic currency detection');
assert(cleanValue('١٬٢٥٠ ريال', 'currency') === 1250, 'currency cleaning must use canonical parser');
assert(cleanValue('١٢٫٥', 'decimal') === 12.5, 'decimal cleaning must preserve Arabic decimal separator');
assert(cleanValue('١٢٣', 'integer') === 123, 'integer cleaning must normalize Arabic digits');

const headerMatrix = [
  ['الرصيد', 'دائن', 'التاريخ 2026-'],
  ['10', '2,275,00', '08-16'],
  ['الرصيد', 'دائن', 'التاريخ 2026-'],
  ['11', '3,250,00', '08-17'],
];
const headerCandidate = detectHeaderRow(headerMatrix);
assert(headerCandidate !== null, 'header detector must identify the business header');
assert(headerCandidate?.structurallySuspicious === false, 'normal split date header must not be marked composite');
const reconstructedRows = rowsFromDetectedHeader(headerMatrix, headerCandidate!);
assert(reconstructedRows.length === 2, 'repeated PDF page headers must be suppressed');
assert(reconstructedRows[0]?.['التاريخ'] === '2026-08-16', 'date year fragment must be reconstructed only from explicit header context');
assert(reconstructedRows[1]?.['التاريخ'] === '2026-08-17', 'second date must use the same explicit header year');

const compositeHeaderMatrix = [
  ['مبلغ الصافي بالمحلي اجمالي الفاتورة الضريبة اﻷعباء', 'العملة نوع الفاتورة التاريخ رقم الفاتورة'],
  ['1630000.0001012026', 'YER نقد 2026-08-01 1012026'],
  ['1630000.0001012026', 'YER نقد 2026-08-02 1012027'],
];
const compositeCandidate = detectHeaderRow(compositeHeaderMatrix);
assert(compositeCandidate?.structurallySuspicious === true, 'merged multi-field PDF headers must be marked structurally suspicious');

const fixturePath = resolve(process.cwd(), 'tests/fixtures/realistic-reports/28-inventory-stockout-reorder.csv');
const fixtureBuffer = readFileSync(fixturePath);
const fixtureDatasets = await parseCSV(fixtureBuffer.buffer.slice(fixtureBuffer.byteOffset, fixtureBuffer.byteOffset + fixtureBuffer.byteLength), '28-inventory-stockout-reorder.csv');
const fixture = fixtureDatasets[0];
assert(fixture?.rowCount === 12, 'inventory fixture must preserve all 12 source rows');
assert(fixture?.rows[0]?.documentNo === 'DOC-28-001', 'first source document must be preserved');
assert(fixture?.rows[11]?.documentNo === 'DOC-28-012', 'last source document must be preserved');
assert(fixture?.rows[0]?.productCode === 'SKU-1', 'alphanumeric product code must not be coerced to a number');
assert(fixture?.rows[0]?.productName === 'صنف 1', 'mixed text product name must not lose its text');
assert(fixture?.rows[0]?.warehouse === 'WH-1', 'alphanumeric warehouse code must not be coerced to a number');
assert(fixture?.rows[11]?.salesQty === 19 && fixture?.rows[11]?.currentStock === 35, 'numeric inventory fields must remain numeric');

console.log('File-engine behavioral regressions: PASS');
