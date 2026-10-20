import assert from 'node:assert/strict';
import { classifyImport } from '../src/lib/file-engine/import-classifier.ts';

const existing = [
  { sku: '00123', name: 'Sugar', price: 10, unit: 'box' },
  { sku: 'ABC-2', name: 'Tea', price: 20, unit: 'box' },
];

const preview = classifyImport({
  incomingRows: [
    { sku: '٠٠١٢٣', name: 'Sugar', price: 12, unit: 'box' },
    { sku: 'ABC-2', name: 'Tea', price: 20, unit: 'box' },
    { sku: 'NEW-1', name: 'Coffee', price: 30, unit: 'box' },
    { sku: '', name: 'Broken', price: 1, unit: 'box' },
    { sku: 'ABC-2', name: 'Duplicate', price: 21, unit: 'box' },
  ],
  existingRows: existing,
  matchingKeys: ['sku'],
  requiredFields: ['sku', 'name'],
  nullPolicy: 'allow',
});

assert.equal(preview.total, 5);
assert.equal(preview.updateCount, 1);
assert.equal(preview.unchangedCount, 1);
assert.equal(preview.newCount, 1);
assert.equal(preview.invalidCount, 1);
assert.equal(preview.conflictCount, 1);
assert.equal(preview.rows[0].businessKey, '00123');
assert.deepEqual(preview.rows[0].changedFields, ['price']);
assert.equal(preview.rows[0].decision, 'update');
assert.equal(preview.rows[4].decision, 'conflict');
assert.deepEqual(preview.rows[4].changedFields, ['name', 'price']);
assert.equal(preview.writesAllowed, false);
assert.deepEqual(preview.rows[0].ignoredNullFields, []);

const nullSafe = classifyImport({
  incomingRows: [{ sku: '00123', name: '', price: null }],
  existingRows: existing,
  matchingKeys: ['sku'],
  requiredFields: ['sku'],
  nullPolicy: 'allow',
});
assert.equal(nullSafe.rows[0].decision, 'unchanged');
assert.deepEqual(nullSafe.rows[0].ignoredNullFields.sort(), ['name', 'price']);

const rejectNull = classifyImport({
  incomingRows: [{ sku: '00123', name: 'Sugar', price: null }],
  existingRows: existing,
  matchingKeys: ['sku'],
  requiredFields: ['sku'],
  nullPolicy: 'reject',
});
assert.equal(rejectNull.rows[0].decision, 'invalid');
assert.equal(rejectNull.rows[0].errors.includes('Null value rejected: price'), true);

console.log('Import classifier regressions: PASS');
