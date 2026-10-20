import assert from 'node:assert/strict';
import { deriveReportIntelligence } from '../src/lib/report-intelligence/report-smart-insights.ts';
import { applyArchetypeRuleSet } from '../src/lib/report-intelligence/archetype-evaluator.ts';
import { getReportArchetype } from '../src/lib/report-intelligence/archetype-registry.ts';
import { matchCanonicalField } from '../src/lib/report-intelligence/canonical-schema.ts';

const result = deriveReportIntelligence({
  specialty: 'inventory',
  rowCount: 4,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'رقم الصنف', mappedField: 'sku' },
        { name: 'السعر', mappedField: 'price' },
        { name: 'المخزن', mappedField: 'warehouse' },
      ],
    }],
  },
  renderedOutput: {},
  canonicalRows: [
    { row_number: 1, data: { sku: 'A1', price: 10, warehouse: 'W1' } },
    { row_number: 2, data: { sku: 'A1', price: 12, warehouse: 'W1' } },
    { row_number: 3, data: { sku: 'A2', price: 7, warehouse: 'W1' } },
    { row_number: 4, data: { sku: 'A3', price: 8, warehouse: 'W2' } },
  ],
});

const signal = result.signals.find((item) => item.id === 'inventory:price-variation');
assert.ok(signal, 'price variation signal must exist');
assert.ok(signal.soWhat.length > 0, 'signal must explain SO WHAT');
assert.ok(signal.impact.length > 0, 'signal must expose bounded impact');
assert.ok(signal.ownerHint.length > 0, 'signal must expose owner hint');

const recommendation = result.recommendations.find((item) => item.id === 'rec:inventory:price-variation');
assert.ok(recommendation, 'recommendation must be linked to signal');
assert.equal(recommendation?.ownerHint, signal.ownerHint);
assert.ok(recommendation?.expectedOutcome.length, 'recommendation must define expected outcome');
assert.ok(recommendation?.evidence.length, 'recommendation must retain evidence');

console.log('PASS: advisor value chain exposes WHY → SO WHAT → IMPACT → OWNER → EXPECTED OUTCOME with source evidence.');


// A genuine invoice extract may cover several weeks but less than two calendar months.
// Keep its source-derived trend available at an honest weekly grain and parse day-first
// hyphenated dates consistently with the application's imported date conventions.
const shortWindowRows = Array.from({ length: 20 }, (_, index) => ({
  row_number: index + 1,
  data: {
    documentDate: String(index + 1).padStart(2, '0') + '-09-2026',
    netAmount: index < 10 ? 100 : 200,
  },
}));
const trendProfile = getReportArchetype('sales.over-time');
assert.ok(trendProfile, 'sales-over-time profile must remain registered');
const trendBase = {
  findings: [],
  risks: [],
  opportunities: [],
  signals: [],
  recommendations: [],
  advisorBrief: {
    topFinding: null,
    recommendedAction: '',
    headline: '',
    ownerHint: '',
    expectedOutcome: '',
    measurement: '',
    proofRequirement: '',
  },
};
const trendResult = applyArchetypeRuleSet(trendProfile, {
  specialty: 'sales',
  rowCount: shortWindowRows.length,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'documentDate', mappedField: 'documentDate' },
        { name: 'netAmount', mappedField: 'netAmount' },
      ],
    }],
  },
  canonicalRows: shortWindowRows,
}, trendBase);
assert.ok(trendResult.findings.some((finding) => finding.id === 'archetype:sales.over-time:trend'),
  'a 20-day source with multiple weeks must produce a source-derived trend finding');
assert.ok(trendResult.signals.some((signal) => signal.id === 'model:sales.over-time'),
  'short-window trend must publish its model signal');
assert.ok(trendResult.recommendations.some((item) => item.id === 'rec:archetype:sales.over-time'),
  'short-window trend must remain connected to an explicit recommendation');
const trendEvidence = trendResult.findings.find((finding) => finding.id === 'archetype:sales.over-time:trend')?.evidence ?? [];
assert.ok(trendEvidence.includes('periodGranularity=week'),
  'trend must disclose that its comparison grain is weekly when monthly periods are unavailable');
assert.ok(trendEvidence.some((item) => item.startsWith('observedPeriods=') && Number(item.split('=')[1]) >= 2),
  'trend must expose the count of observed periods used in the comparison');
console.log('PASS: short-window trend uses honest weekly/day granularity and exposes its evidence.');


// Reproduce the live source shape: analysis metadata maps "date" to "invoice_date",
// but the persisted canonical row contains "date", not an invented invoice_date key.
// The real source also exposes its local net amount under the Arabic business header.
assert.equal(matchCanonicalField('مبلغ الصافي بالمحلي'), 'netAmount',
  'the real invoice net-amount header must map to the unambiguous canonical money field');
const mappedMetadataRows = Array.from({ length: 20 }, (_, index) => ({
  row_number: index + 1,
  data: {
    date: '2026-09-' + String(index + 1).padStart(2, '0'),
    'مبلغ الصافي بالمحلي': index < 10 ? 100 : 200,
  },
}));
const mappedMetadataResult = applyArchetypeRuleSet(trendProfile, {
  specialty: 'sales',
  rowCount: mappedMetadataRows.length,
  sourceAnalysis: {
    datasets: [{
      columns: [
        { name: 'date', mappedField: 'invoice_date' },
        { name: 'مبلغ الصافي بالمحلي', mappedField: null },
      ],
    }],
  },
  canonicalRows: mappedMetadataRows,
}, trendBase);
assert.ok(mappedMetadataResult.findings.some((finding) => finding.id === 'archetype:sales.over-time:trend'),
  'mapped metadata must not hide a trend when the real source row has date and net amount');
assert.ok(mappedMetadataResult.signals.some((signal) => signal.id === 'model:sales.over-time'),
  'mapped source-key regression must retain the specialized model signal');
assert.ok(mappedMetadataResult.recommendations.some((item) => item.id === 'rec:archetype:sales.over-time'),
  'mapped source-key regression must retain the specialized recommendation');
const mappedEvidence = mappedMetadataResult.findings.find((finding) => finding.id === 'archetype:sales.over-time:trend')?.evidence ?? [];
assert.ok(mappedEvidence.includes('dateField=date'),
  'trend evidence must identify the persisted source date key, not metadata-only invoice_date');
assert.ok(mappedEvidence.includes('valueField=مبلغ الصافي بالمحلي'),
  'trend evidence must identify the source-backed Arabic amount key');
console.log('PASS: mapped analysis fields resolve to real persisted row keys and preserve source-backed trend output.');
