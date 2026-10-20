import assert from 'node:assert/strict';
import { deriveEvidenceBusinessSignals } from '../src/lib/report-intelligence/evidence-business-signals.ts';

function column(name, mappedField = name) {
  return { name, mappedField };
}

function row(row_number, data) {
  return { row_number, data };
}

const salesRows = [];
for (let month = 1; month <= 6; month += 1) {
  const total = 1000 + (month - 1) * 300;
  for (let i = 0; i < 4; i += 1) {
    salesRows.push(row(salesRows.length + 1, {
      date: '2026-' + String(month).padStart(2, '0') + '-10',
      total_amount: total,
      revenue: total,
      cost: 930,
      customer_name: i === 0 ? 'TOP-CUSTOMER' : 'C-' + i + '-' + month,
      discount_amount: month === 6 ? 120 : 20,
      return_amount: month === 6 && i === 0 ? 300 : 0,
      outstanding_balance: 500 + month * 30,
      payable: 250,
    }));
  }
}
salesRows.push(row(1000, {
  date: '2026-06-29',
  total_amount: 120000,
  revenue: 120000,
  cost: 114000,
  customer_name: 'OUTLIER-2',
  discount_amount: 25000,
  return_amount: 25000,
  outstanding_balance: 900,
  payable: 200,
}));

salesRows.push(row(999, {
  date: '2026-06-30',
  total_amount: 100000,
  revenue: 100000,
  cost: 95000,
  customer_name: 'OUTLIER',
  discount_amount: 0,
  return_amount: 0,
  outstanding_balance: 800,
  payable: 200,
}));

const salesSignals = deriveEvidenceBusinessSignals({
  specialty: 'sales',
  rowCount: salesRows.length,
  canonicalRows: salesRows,
  sourceAnalysis: {
    datasets: [{
      columns: [
        column('date'),
        column('total_amount'),
        column('revenue'),
        column('cost'),
        column('customer_name'),
        column('discount_amount'),
        column('return_amount'),
        column('outstanding_balance'),
        column('payable'),
      ],
    }],
  },
});

for (const expected of [
  'business:trend',
  'business:anomaly',
  'business:concentration',
  'business:margin-pressure',
  'business:return-effect',
  'business:discount-effect',
  'business:working-capital',
]) {
  assert.ok(salesSignals.some((signal) => signal.id === expected), expected + ' missing');
}
assert.ok((salesSignals.find((signal) => signal.id === 'business:concentration')?.drivers?.length ?? 0) > 0, 'concentration drivers missing');

const inventoryRows = Array.from({ length: 20 }, (_, index) => row(index + 1, {
  date: '2026-' + String((index % 6) + 1).padStart(2, '0') + '-15',
  quantity: index < 7 ? 5 : 100,
  reorder_level: 10,
  avg_daily_sales: index < 7 ? 1 : 2,
  product_name: 'SKU-' + (index < 7 ? 'RISK' : index),
  total_amount: 100 + index,
}));
const inventorySignals = deriveEvidenceBusinessSignals({
  specialty: 'inventory',
  rowCount: inventoryRows.length,
  canonicalRows: inventoryRows,
  sourceAnalysis: {
    datasets: [{
      columns: [
        column('date'),
        column('quantity'),
        column('reorder_level'),
        column('avg_daily_sales'),
        column('product_name'),
        column('total_amount'),
      ],
    }],
  },
});
assert.ok(inventorySignals.some((signal) => signal.id === 'business:inventory-risk'), 'inventory risk missing');

const cleanRows = Array.from({ length: 12 }, (_, index) => row(index + 1, {
  date: '2026-' + String((index % 6) + 1).padStart(2, '0') + '-15',
  total_amount: 100 + index,
  customer_name: 'C-' + index,
}));
const cleanSignals = deriveEvidenceBusinessSignals({
  specialty: 'sales',
  rowCount: cleanRows.length,
  canonicalRows: cleanRows,
  sourceAnalysis: {
    datasets: [{
      columns: [column('date'), column('total_amount'), column('customer_name')],
    }],
  },
});
assert.ok(cleanSignals.every((signal) => signal.severity === 'info' || signal.id === 'business:trend'), 'unexpected high-risk signal on clean source');

console.log('REPORT_BUSINESS_SIGNALS_CONTRACT_PASS');
console.log(JSON.stringify({
  sales: salesSignals.map((signal) => ({ id: signal.id, severity: signal.severity, drivers: signal.drivers?.length ?? 0 })),
  inventory: inventorySignals.map((signal) => ({ id: signal.id, severity: signal.severity, drivers: signal.drivers?.length ?? 0 })),
  clean: cleanSignals.map((signal) => ({ id: signal.id, severity: signal.severity })),
}, null, 2));
