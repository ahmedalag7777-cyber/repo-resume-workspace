import assert from 'node:assert/strict';
import { extractPdfVisualLines, extractPdfVisualRows, type PdfPageText } from '../src/lib/file-engine/pdf-table.ts';
import { parseFile, hasPdfTextEncodingCorruption } from '../src/lib/file-engine/adapters.ts';

const pages: PdfPageText[] = [
  {
    pageNumber: 1,
    items: [
      { text: 'رقم الصنف', x: 10, y: 700, width: 40, height: 10 },
      { text: 'السعر', x: 100, y: 700, width: 30, height: 10 },
      { text: '10101001', x: 10, y: 680, width: 45, height: 10 },
      { text: '10750', x: 100, y: 680, width: 30, height: 10 },
      { text: '10101002', x: 10, y: 660, width: 45, height: 10 },
      { text: '10850', x: 100, y: 660, width: 30, height: 10 },
    ],
  },
  {
    pageNumber: 2,
    items: [
      { text: '10101003', x: 10, y: 700, width: 45, height: 10 },
      { text: '10800', x: 100, y: 700, width: 30, height: 10 },
    ],
  },
];

assert.equal(hasPdfTextEncodingCorruption('ƕĊƹěƐĉ ƞƓžŅ ŀƗĥŏƓƐĉ ļƺŅĊĥƐĉ ƮƏƓŧƐĉ ƞĥƐĊĺ ŀƹŘņƐĉ 60336'), true);
assert.equal(hasPdfTextEncodingCorruption('رقم الصنف السعر 10101001 10750'), false);

const visualRows = extractPdfVisualRows(pages);
assert.equal(visualRows.length, 4);
assert.deepEqual(visualRows.map(({ pageNumber, lineNumber, cells }) => ({ pageNumber, lineNumber, cells })), [
  { pageNumber: 1, lineNumber: 1, cells: ['رقم الصنف', 'السعر'] },
  { pageNumber: 1, lineNumber: 2, cells: ['10101001', '10750'] },
  { pageNumber: 1, lineNumber: 3, cells: ['10101002', '10850'] },
  { pageNumber: 2, lineNumber: 1, cells: ['10101003', '10800'] },
]);

const lines = extractPdfVisualLines(pages);
assert.equal(lines.length, 4);
assert.deepEqual(lines.map(({ pageNumber, lineNumber, text }) => ({ pageNumber, lineNumber, text })), [
  { pageNumber: 1, lineNumber: 1, text: 'رقم الصنف | السعر' },
  { pageNumber: 1, lineNumber: 2, text: '10101001 | 10750' },
  { pageNumber: 1, lineNumber: 3, text: '10101002 | 10850' },
  { pageNumber: 2, lineNumber: 1, text: '10101003 | 10800' },
]);
assert.ok(!lines.some((line) => line.text.includes('10101001') && line.text.includes('10101003')));
const minimalPdf = new TextEncoder().encode('%PDF-1.4\n%%EOF').buffer;
try {
  await parseFile(minimalPdf, 'runtime-check.pdf', 'pdf');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  assert.ok(!/DOMMatrix is not defined/i.test(message), message);
  assert.ok(!/Path2D is not defined/i.test(message), message);
  assert.ok(!/ImageData is not defined/i.test(message), message);
}
console.log('PDF_VISUAL_LINE_FALLBACK_PASS');
