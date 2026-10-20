import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const fixturePath = resolve(process.cwd(), 'tests/fixtures/realistic-reports/28-inventory-stockout-reorder.csv');
const pagePath = resolve(process.cwd(), 'src/pages/ProposalDemoPage.tsx');

const fixture = readFileSync(fixturePath, 'utf8').trim();
const page = readFileSync(pagePath, 'utf8');

const lines = fixture.split(/\r?\n/).filter(Boolean);
const header = lines.shift();
const expectedHeader = 'documentNo,documentDate,productCode,productName,warehouse,salesQty,currentStock,netAmount,cost,profit,paidAmount';

assert.equal(header, expectedHeader, 'canonical inventory fixture header drifted');
assert.equal(lines.length, 12, 'inventory fixture row count drifted');

const rows = lines.map((line, index) => {
  const cells = line.split(',');
  assert.equal(cells.length, 11, `fixture row ${index + 2} column count drifted`);
  return {
    salesQty: Number(cells[5]),
    currentStock: Number(cells[6]),
    netAmount: Number(cells[7]),
    profit: Number(cells[9]),
  };
});

const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
assert.equal(sum('salesQty'), 162, 'sales quantity total drifted');
assert.equal(sum('currentStock'), 342, 'current stock total drifted');
assert.equal(sum('netAmount'), 3186, 'net sales total drifted');
assert.equal(sum('profit'), 918, 'profit total drifted');
assert.equal(rows.filter(row => row.salesQty > 0 && row.currentStock / row.salesQty < 2).length, 3, 'low-coverage count drifted');

assert.match(page, /28-inventory-stockout-reorder\.csv\?raw/, 'proposal surface is not bound to the canonical fixture');
assert.match(page, /const LIVE_TOTALS = LIVE_ROWS\.reduce/, 'proposal surface no longer derives totals from parsed rows');
assert.doesNotMatch(page, /const LIVE_ROWS: LiveRow\[\] = \[/, 'proposal surface still contains hardcoded business rows');
assert.doesNotMatch(page, /\['708','الربح'/, 'stale unsupported profit metric remains in the proposal surface');

console.log('PASS proposal inventory truth contract: 12 rows / 162 sales / 342 stock / 3,186 net / 918 profit / 3 low-coverage rows');
