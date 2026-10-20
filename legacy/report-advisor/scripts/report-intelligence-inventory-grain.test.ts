import assert from 'node:assert/strict';
import { deriveReportIntelligence } from '../src/lib/report-intelligence/report-smart-insights.ts';

const columns = [
  { name: 'رقم الصنف', mappedField: 'sku', nullCount: 0 },
  { name: 'السعر', mappedField: 'price', nullCount: 1 },
  { name: 'المخزن', mappedField: 'warehouse', nullCount: 0 },
  { name: 'اسم الصنف', mappedField: 'name', nullCount: 1 },
  { name: 'المستوي', mappedField: null, nullCount: 0 },
].map((item) => ({
  ...item,
  mappingConfidence: item.mappedField ? 98 : 0,
  statistics: {},
}));

const canonicalRows = [
  { row_number: 1, data: { sku: '101', price: 100, warehouse: 1, name: 'A' } },
  { row_number: 2, data: { sku: '101', price: 120, warehouse: 2, name: 'A' } },
  { row_number: 3, data: { sku: '101', price: 120, warehouse: 2, name: 'A' } },
  { row_number: 4, data: { sku: '102', price: null, warehouse: 1, name: null } },
];

const report = deriveReportIntelligence({
  specialty: 'inventory',
  rowCount: canonicalRows.length,
  sourceAnalysis: { datasets: [{ columns }] },
  renderedOutput: {
    sourceMetrics: {
      inventory: {
        missingPriceRows: 1,
        missingNameRows: 1,
        uniqueSkuCount: 2,
        warehouseCount: 2,
        unmappedFields: ['المستوي'],
      },
    },
  },
  canonicalRows,
});

assert.ok(report.signals.some((signal) => signal.id === 'inventory:missing-price'));
assert.ok(report.signals.some((signal) => signal.id === 'inventory:price-variation'));
assert.ok(report.signals.some((signal) => signal.id === 'source:duplicate-key'));
assert.ok(report.recommendations.some((item) => item.id === 'rec:inventory:price-variation'));

const semanticColumns = [
  { name: 'رقم الصنف', mappedField: null, nullCount: 0, mappingConfidence: 0, statistics: {} },
  { name: 'اسم الصنف', mappedField: null, nullCount: 0, mappingConfidence: 0, statistics: {} },
  { name: 'الرصيد', mappedField: null, nullCount: 0, mappingConfidence: 0, statistics: {} },
  { name: 'معدل البيع ليومي', mappedField: null, nullCount: 0, mappingConfidence: 0, statistics: {} },
  { name: 'الفترةالمتوقعة لنفادالكمية', mappedField: null, nullCount: 0, mappingConfidence: 0, statistics: {} },
  { name: 'صافي المبيعات', mappedField: null, nullCount: 0, mappingConfidence: 0, statistics: {} },
];

const semanticRows = [
  { row_number: 17, data: { sku: '101', product_name: 'قمح 50ك', current_stock: 0, daily_sales_rate: 3, stockout_days: 0, sales_qty: 90 } },
  { row_number: 18, data: { sku: '102', product_name: 'دقيق 25ك', current_stock: 10, daily_sales_rate: 1, stockout_days: 10, sales_qty: 30 } },
  { row_number: 19, data: { sku: '103', product_name: 'سكر 50ك', current_stock: 60, daily_sales_rate: 1, stockout_days: 60, sales_qty: 20 } },
];

const semanticReport = deriveReportIntelligence({
  specialty: 'inventory',
  rowCount: semanticRows.length,
  sourceAnalysis: { datasets: [{ columns: semanticColumns }] },
  canonicalRows: semanticRows,
});

const stockoutSignal = semanticReport.signals.find((signal) => signal.id === 'inventory:stockout');
assert.ok(stockoutSignal, 'Arabic inventory headers must produce a stockout signal');
assert.ok(stockoutSignal.evidence.some((item) => item.includes('sample=') && item.includes('قمح 50ك')), 'stockout signal must expose source-row evidence');
const coverageSignal = semanticReport.signals.find((signal) => signal.id === 'inventory:low-coverage');
assert.ok(coverageSignal, 'coverage must be derived from a time-based measure');
assert.ok(coverageSignal.evidence.some((item) => item.includes('coverageThresholdDays=30')), 'coverage evidence must declare its unit');
assert.ok(!coverageSignal.evidence.some((item) => item.includes('threshold=2.00 periods')), 'coverage must not use cumulative sales as a fake time unit');
console.log('REPORT_INTELLIGENCE_INVENTORY_GRAIN_PASS');
