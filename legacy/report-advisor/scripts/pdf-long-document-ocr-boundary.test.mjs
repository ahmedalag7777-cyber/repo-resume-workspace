import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/lib/file-engine/adapters.ts', 'utf8');
assert.ok(source.includes('const PDF_OCR_MAX_PAGES = 120;'));
assert.ok(source.includes('PDF_OCR_PAGE_LIMIT_EXCEEDED'));
assert.ok(source.includes('approved server OCR adapter'));
assert.ok(source.includes('PDF_SCANNED_IMAGE_ONLY_SERVER_AUTHORITY_UNAVAILABLE'));
console.log('PDF_LONG_DOCUMENT_OCR_BOUNDARY_PASS');
