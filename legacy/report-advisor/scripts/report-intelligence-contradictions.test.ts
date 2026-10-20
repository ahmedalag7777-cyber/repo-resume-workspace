import assert from 'node:assert/strict';
import { deriveReportIntelligence } from '../src/lib/report-intelligence/report-smart-insights.ts';

const report = deriveReportIntelligence({
  specialty: 'sales',
  rowCount: 4,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'invoice_number', mappedField: 'invoice_number', nullCount: 0 },
        { name: 'total', mappedField: 'total', nullCount: 0 },
        { name: 'paid_amount', mappedField: 'paid_amount', nullCount: 0 },
      ],
    }],
  },
  canonicalRows: [
    { row_number: 1, data: { invoice_number: 'A-1', total: 100, paid_amount: 120 } },
    { row_number: 2, data: { invoice_number: 'A-2', total: 200, paid_amount: 100 } },
    { row_number: 3, data: { invoice_number: 'A-3', total: 300, paid_amount: 0 } },
    { row_number: 4, data: { invoice_number: 'A-3', total: 350, paid_amount: 0 } },
  ],
});

assert.ok(report.signals.some((signal) => signal.id === 'source:paid-above-total'));
assert.ok(report.signals.some((signal) => signal.id === 'source:invoice-total-conflict'));
assert.ok(report.recommendations.some((item) => item.id === 'rec:source:paid-above-total'));
assert.ok(report.recommendations.some((item) => item.id === 'rec:source:invoice-total-conflict'));
console.log('REPORT_INTELLIGENCE_CONTRADICTIONS_PASS');
