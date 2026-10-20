import assert from 'node:assert/strict';

function normalizeExtraction(input) {
  if (!input || typeof input.text !== 'string' || input.text.trim() === '') {
    return { status: 'FAILED', reason: 'EMPTY_OR_INVALID_EXTRACTION', text: null };
  }
  return { status: 'EXTRACTED', reason: null, text: input.text.trim() };
}

const ok = normalizeExtraction({ text: '  Invoice 150  ' });
assert.deepEqual(ok, { status: 'EXTRACTED', reason: null, text: 'Invoice 150' });

for (const bad of [null, {}, { text: '' }, { text: '   ' }, { text: null }]) {
  const result = normalizeExtraction(bad);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.text, null);
  assert.equal(result.reason, 'EMPTY_OR_INVALID_EXTRACTION');
}

// Failed extraction must never become canonical truth.
const failed = normalizeExtraction({ text: '' });
assert.throws(() => {
  if (failed.status !== 'EXTRACTED') throw new Error('EXTRACTION_REQUIRED');
}, /EXTRACTION_REQUIRED/);

console.log('ocr failure modes: PASS');
