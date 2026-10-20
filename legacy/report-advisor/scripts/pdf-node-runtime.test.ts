import assert from 'node:assert/strict';

import { parseFile } from '../src/lib/file-engine/adapters.ts';

const minimalPdf = new TextEncoder().encode('%PDF-1.4\n%%EOF').buffer;

try {
  await parseFile(minimalPdf, 'runtime-check.pdf', 'pdf');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  assert.ok(!/DOMMatrix is not defined/i.test(message), message);
  assert.ok(!/Path2D is not defined/i.test(message), message);
  assert.ok(!/ImageData is not defined/i.test(message), message);
}

console.log('PDF_NODE_RUNTIME_PASS');
