import assert from 'node:assert/strict';
import { normalizeBusinessKey, businessKeysEqual, buildBusinessKeyIndex, matchBusinessKey } from '../src/lib/file-engine/business-key.ts';

assert.equal(normalizeBusinessKey('  ab-001  '), 'AB-001');
assert.equal(normalizeBusinessKey('أب ١٢٣'), 'اب123');
assert.equal(normalizeBusinessKey('٠٠١٢٣'), '00123');
assert.equal(normalizeBusinessKey('A\u200B-\u200F001'), 'A-001');
assert.equal(businessKeysEqual(' 00123 ', '٠٠١٢٣'), true);
assert.equal(businessKeysEqual('ABC-1', 'ABC-2'), false);

const rows = [{ sku: '00123', name: 'Existing' }, { sku: 'AB-001', name: 'Arabic mixed' }];
const index = buildBusinessKeyIndex(rows, row => row.sku);
assert.equal(matchBusinessKey(index, ' ٠٠١٢٣ ').row?.name, 'Existing');
assert.equal(matchBusinessKey(index, 'ab-001').row?.name, 'Arabic mixed');
assert.equal(matchBusinessKey(index, '').reason, 'missing-key');
assert.equal(matchBusinessKey(index, 'ZZ-999').reason, 'not-found');

console.log('Business-key regressions: PASS');
