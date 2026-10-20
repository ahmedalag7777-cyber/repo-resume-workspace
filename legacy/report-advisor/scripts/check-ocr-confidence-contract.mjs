import assert from 'node:assert/strict';
const normalize = (confidence) => typeof confidence === 'number' && Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
const usable = (confidence, text) => normalize(confidence) >= 0.7 && typeof text === 'string' && text.trim().length > 0;
assert.equal(usable(0.9, 'فاتورة 123'), true);
assert.equal(usable(0.69, 'فاتورة 123'), false);
assert.equal(usable(Number.NaN, 'فاتورة 123'), false);
assert.equal(usable(Number.POSITIVE_INFINITY, 'فاتورة 123'), false);
assert.equal(usable(0.9, '   '), false);
console.log('OCR confidence contract: PASS');
