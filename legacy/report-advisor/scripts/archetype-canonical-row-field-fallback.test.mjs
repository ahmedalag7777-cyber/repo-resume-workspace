import assert from 'node:assert/strict';

const { runReportArchetype } = await import('../src/lib/report-intelligence/archetype-registry.ts');

const canonicalRows = Array.from({ length: 20 }, (_, index) => ({
  row_number: index + 1,
  data: {
    documentDate: index < 10 ? '2026-01-' + String(index + 1).padStart(2, '0') : '2026-02-' + String(index - 9).padStart(2, '0'),
    netAmount: index < 10 ? 100 + index * 5 : 180 + index * 7,
  },
}));

const result = runReportArchetype({
  archetypeId: 'sales.over-time',
  report: {
    specialty: 'sales',
    rowCount: canonicalRows.length,
    canonicalRows,
    sourceAnalysis: {
      datasets: [
        {
          name: 'real-corpus-without-column-descriptors',
          rowCount: canonicalRows.length,
          columns: [],
        },
      ],
    },
  },
  availableFields: ['documentDate', 'netAmount'],
  sampleSize: canonicalRows.length,
  provenance: {
    tenantId: 'real-corpus-test',
    sourceHash: 'sha256:' + 'a'.repeat(64),
    reportExecutionJobId: 'job-real-corpus-test',
    evidenceSnapshotId: 'snapshot-real-corpus-test',
    evidencePassportId: 'passport-real-corpus-test',
    sourceVersionId: null,
  },
});

assert.equal(result.state, 'SUPPORTED');
assert.ok(result.intelligence.signals.some((signal) => signal.id === 'model:sales.over-time'));
assert.ok(result.intelligence.recommendations.some((recommendation) => recommendation.id === 'rec:archetype:sales.over-time'));

console.log('PASS: archetype evaluator resolves canonical row keys when analysis column descriptors are absent');
