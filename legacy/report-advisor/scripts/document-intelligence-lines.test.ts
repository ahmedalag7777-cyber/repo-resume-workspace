import assert from 'node:assert/strict';
import { deriveReportIntelligence } from '../src/lib/report-intelligence/report-smart-insights.ts';

const report = deriveReportIntelligence({
  rowCount: 5,
  specialty: null,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'page_number', mappedField: null, nullCount: 0 },
        { name: 'line_number', mappedField: null, nullCount: 0 },
        { name: 'text', mappedField: null, nullCount: 0 },
      ],
    }],
  },
  canonicalRows: [
    { row_number: 1, data: { page_number: 1, line_number: 1, text: 'تقرير المبيعات 2026' } },
    { row_number: 2, data: { page_number: 1, line_number: 2, text: 'التاريخ: 2026-09-01' } },
    { row_number: 3, data: { page_number: 1, line_number: 3, text: 'إجمالي المبيعات 125,000 ريال' } },
    { row_number: 4, data: { page_number: 2, line_number: 1, text: 'التاريخ: 2026-09-02' } },
    { row_number: 5, data: { page_number: 2, line_number: 2, text: 'الإجمالي 131,000 ريال' } },
  ],
});

assert.ok(report.signals.some((signal) => signal.id === 'document:structure'));
assert.ok(report.signals.some((signal) => signal.id === 'document:sections'));
assert.ok(report.signals.some((signal) => signal.id === 'document:date-presence'));
assert.ok(report.signals.some((signal) => signal.id === 'document:amount-presence'));
assert.ok(!report.signals.some((signal) => signal.id === 'document:date-gap'));
console.log('DOCUMENT_INTELLIGENCE_LINES_PASS');
