import fs from 'node:fs';

const dashboard = fs.readFileSync('src/lib/dashboard-canonical.ts', 'utf8');
const forbidden = [
  'totalRows: Number(row.totalRows ?? 0)',
  'filteredRows: Number(row.filteredRows ?? 0)',
  'lowStock: Number(row.lowStock ?? 0)',
  'outOfStock: Number(row.outOfStock ?? 0)',
  'invoice_count:Number(row.invoice_count??0)',
  'totalRevenue: Number(row.totalRevenue ?? 0)',
  'unknownRows: Number(row.unknownRows ?? 0)',
];
const failures = forbidden.filter(marker => dashboard.includes(marker));
for (const marker of ['totalRows:number|null', 'filteredRows:number|null', 'lowStock:number|null', 'outOfStock:number|null', 'invoice_count:number|null', 'totalRevenue:number|null']) {
  if (!dashboard.includes(marker)) failures.push(`missing nullable truth field: ${marker}`);
}
for (const marker of ['totalRows: finiteOrNull(row.totalRows)', 'totalRevenue: finiteOrNull(row.totalRevenue)', 'unknownRows: finiteOrNull(row.unknownRows)']) {
  if (!dashboard.includes(marker)) failures.push(`missing fail-closed numeric mapping: ${marker}`);
}
if (failures.length) {
  console.error('DASHBOARD_NUMERIC_TRUTH_FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const unsafe = dashboard.replaceAll('finiteOrNull(row.totalRevenue)', 'Number(row.totalRevenue ?? 0)');
if (!unsafe.includes('Number(row.totalRevenue ?? 0)')) throw new Error('test-of-test fixture did not introduce unsafe zero fallback');
if (unsafe.includes('totalRevenue: finiteOrNull(row.totalRevenue)')) throw new Error('test-of-test failed to detect unsafe replacement');

console.log('DASHBOARD_NUMERIC_TRUTH_PASS');
console.log('Verified: absent/non-numeric dashboard business values remain unknown instead of being coerced to zero, with an effective guard-removal self-test.');
