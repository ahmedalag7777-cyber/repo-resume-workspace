import assert from 'node:assert/strict';
import { parseFile } from '../src/lib/file-engine/adapters.ts';
import { detectFormat } from '../src/lib/file-engine/detector.ts';
import { buildGenericFileIntelligence } from '../src/lib/file-engine/generic-intelligence.ts';
import { selectGenericSourceRows } from '../src/lib/file-engine/generic-source-rows.ts';
import { buildUniversalReportIntelligence } from '../src/lib/universal-report-intelligence.ts';
import { composeIntelligenceLayers } from '../src/lib/report-intelligence/compose-intelligence-layers.ts';
import { inferReportSpecialty, normalizeReportHeader } from '../src/lib/file-engine/specialty-inference.ts';
import * as XLSX from 'xlsx';

function specialtyDataset(headers) {
  return {
    columns: headers.map((name) => ({ name, mappedField: null })),
  };
}

assert.equal(normalizeReportHeader('Current Stock'), 'currentstock', 'English whitespace must normalize instead of deleting literal s characters');
assert.equal(normalizeReportHeader('الرصيد المستحق'), 'الرصيدالمستحق', 'Arabic whitespace must normalize');
assert.equal(inferReportSpecialty(specialtyDataset(['Current Stock', 'Sales Qty', 'SKU'])), 'inventory', 'spaced English stock headers must retain inventory specialization');
assert.equal(inferReportSpecialty(specialtyDataset(['الرصيد المستحق', 'المدفوع'])), 'receivables', 'spaced Arabic receivables headers must retain receivables specialization');
assert.equal(inferReportSpecialty(specialtyDataset(['اسم المورد', 'total'])), 'purchases', 'raw supplier identity + total should infer purchases');
assert.equal(inferReportSpecialty(specialtyDataset(['اسم العميل', 'total'])), 'sales', 'raw customer identity + total should infer sales');
assert.equal(inferReportSpecialty(specialtyDataset(['name', 'status', 'total'])), undefined, 'generic entity/status/total columns must not invent a specialty');

function buffer(value) {
  return new TextEncoder().encode(value).buffer;
}

async function main() {
  const unknownText = 'نص عام في ملف غير معروف\nيوجد تأخير ويجب المراجعة\nالإجمالي 1200 ريال';
  const detectedUnknown = detectFormat({ name: 'business.log', size: unknownText.length, type: 'text/plain' }, buffer(unknownText));
  assert.equal(detectedUnknown.format, 'txt', 'unknown readable text should use generic text fallback');
  assert.equal(detectedUnknown.category, 'text', 'generic fallback category');
  assert.ok(detectedUnknown.warnings.some((warning) => warning.includes('مسار النص العام')), 'generic fallback warning');

  const cases = [
    { format: 'txt', name: 'risk.txt', source: 'توجد مشكلة في المخزون\nيجب مراجعة الكميات المتأخرة\nالإجمالي 1200 ريال', expectedRows: 3, expectedEvidence: 'مشكلة في المخزون' },
    { format: 'csv', name: 'risk.csv', source: 'اسم الصنف,الحالة,الإجمالي\nصنف متأخر,تأخير,100\nصنف سليم,مكتمل,200', expectedRows: 2, expectedEvidence: 'تأخير' },
    { format: 'json', name: 'risk.json', source: '[{"name":"صنف متأخر","status":"تأخير","total":100},{"name":"صنف سليم","status":"مكتمل","total":200}]', expectedRows: 2, expectedEvidence: 'تأخير' },
    { format: 'jsonl', name: 'risk.jsonl', source: '{"name":"صنف متأخر","status":"تأخير","total":100}\n{"name":"صنف سليم","status":"مكتمل","total":200}', expectedRows: 2, expectedEvidence: 'تأخير' },
    { format: 'xml', name: 'sales.xml', source: '<root><row><product>صنف 1</product><status>تأخير</status><total>100</total></row><row><product>صنف 2</product><status>مكتمل</status><total>200</total></row></root>', expectedRows: 2, expectedEvidence: 'تأخير' },
    { format: 'yaml', name: 'sales.yaml', source: '- product: صنف 1\n  status: تأخير\n  total: 100\n- product: صنف 2\n  status: مكتمل\n  total: 200', expectedRows: 2, expectedEvidence: 'تأخير' },
    { format: 'markdown', name: 'notes.md', source: '# متابعة\nتوجد مشكلة في المخزون\nيجب مراجعة الكميات المتأخرة\nالإجمالي 1200 ريال', expectedRows: 4, expectedEvidence: 'مشكلة في المخزون' },
    { format: 'rtf', name: 'note.rtf', source: '{\\rtf1\\ansi خطر تأخير\\par يجب المراجعة\\par}', expectedRows: 2, expectedEvidence: 'تأخير' },
  ];
  for (const item of cases) {
    const datasets = await parseFile(buffer(item.source), item.name, item.format);
    assert.equal(datasets.length, 1, item.format + ' should produce one dataset');
    assert.equal(datasets[0].rowCount, item.expectedRows, item.format + ' row count');
    const intelligence = buildGenericFileIntelligence(datasets[0], item.format);
    assert.ok(intelligence.summary.length > 20, item.format + ' summary');
    assert.ok(intelligence.findings.length > 0, item.format + ' must expose source-derived findings');
    assert.ok(intelligence.guidance.boundary.includes('لا يحول'), item.format + ' evidence boundary');
    if (item.expectedEvidence) {
      assert.ok(JSON.stringify(intelligence).includes(item.expectedEvidence), item.format + ' output must retain evidence from the uploaded content');
    }
    if (['csv', 'json', 'jsonl', 'xml', 'yaml'].includes(item.format)) {
      assert.ok(!intelligence.summary.includes('ملف نشاط العملاء'), item.format + ' must not infer a customer portfolio from generic entity/status/total columns');
      assert.notEqual(intelligence.findings[0]?.title, 'ملف نشاط العملاء', item.format + ' generic table finding must remain domain-neutral');
    }
  }
  // Locale-formatted Arabic numbers must remain measurable even if a persisted
  // generic dataset retains string values instead of adapter-cleaned numbers.
  const parsedArabicNumbers = await parseFile(
    buffer('metric_label,amount_value\nA,١٬٢٣٤٫٥\nB,٢٬٠٠٠٫٠'),
    'arabic-numeric-values.csv',
    'csv',
  );
  assert.equal(parsedArabicNumbers.length, 1, 'Arabic numeric CSV must parse');
  const arabicSource = parsedArabicNumbers[0];
  const rawArabicValues = {
    ...arabicSource,
    columns: arabicSource.columns.map((column) =>
      column.name === 'amount_value' ? { ...column, dataType: 'decimal' } : column),
    rows: [
      { ...arabicSource.rows[0], amount_value: '١٬٢٣٤٫٥' },
      { ...arabicSource.rows[1], amount_value: '٢٬٠٠٠٫٠' },
    ],
  };
  const arabicGeneric = buildGenericFileIntelligence(rawArabicValues, 'csv');
  const arabicMetric = arabicGeneric.guidance.inspect.find((line) => line.includes('المقياس «amount_value»'));
  const expectedArabicSum = (3234.5).toLocaleString('ar-YE', { maximumFractionDigits: 2 });
  assert.ok(arabicMetric?.includes('قيم رقمية 2/2'), 'Arabic-Indic numeric strings must not be lost from generic analysis');
  assert.ok(arabicMetric?.includes('المجموع الحسابي ' + expectedArabicSum), 'Arabic decimal/thousands separators must produce the correct source total');

  // A semantic mapper may guess that "name" means customer_name. The raw
  // source header is generic, so that guess must not authorize specialization.
  const genericMappedDataset = await parseFile(
    buffer('name,status,total\nItem A,تأخير,100\nItem B,مكتمل,200'),
    'generic-mapped.csv',
    'csv',
  );
  assert.equal(genericMappedDataset.length, 1, 'generic-mapped fixture should parse');
  const mappedCustomerGuess = {
    ...genericMappedDataset[0],
    columns: genericMappedDataset[0].columns.map((column) => ({
      ...column,
      mappedField: column.name === 'name' ? 'customer_name'
        : column.name === 'status' ? 'customer_status'
          : column.name === 'total' ? 'total'
            : column.mappedField,
    })),
  };
  const guessedCustomerIntelligence = buildGenericFileIntelligence(mappedCustomerGuess, 'csv');
  assert.ok(!guessedCustomerIntelligence.summary.includes('ملف نشاط العملاء'), 'inferred mappedField must not override a generic raw header');
  assert.notEqual(guessedCustomerIntelligence.findings[0]?.title, 'ملف نشاط العملاء', 'a generic raw name column must not trigger customer specialization');

  // Universal file analysis is the product baseline; the optional specialist catalog
  // must not be required for useful, source-bound findings on an unfamiliar table.
  const unclassifiedDatasetList = await parseFile(
    buffer('record_key,observation_text,amount_value\nA-01,Review pending,100\nB-02,Completed,250\nC-03,Critical stock shortage,75'),
    'unclassified-operational-data.csv',
    'csv',
  );
  assert.equal(unclassifiedDatasetList.length, 1, 'unclassified supported CSV should parse without a specialty');
  const unclassifiedDataset = unclassifiedDatasetList[0];
  const unclassifiedGeneric = buildGenericFileIntelligence(unclassifiedDataset, 'csv');
  assert.ok(unclassifiedGeneric.signals.some((signal) => signal.id === 'generic:file:risk-language'), 'structured tables must preserve source text risk signals alongside numeric profiling');
  assert.ok(unclassifiedGeneric.signals.some((signal) => signal.id === 'generic:file:action-language'), 'structured tables must preserve source text action signals alongside numeric profiling');
  assert.ok(unclassifiedGeneric.recommendations.some((item) => item.id === 'generic:file:review'), 'structured tables must retain a recommendation tied to text-derived signals');
  assert.ok(unclassifiedGeneric.findings.some((finding) => finding.id === 'generic:file:content-profile'), 'structured tables must expose the general content finding alongside table findings');
  assert.ok(unclassifiedGeneric.guidance.inspect.some((line) => line.includes('Critical stock shortage')), 'risk-language evidence from table cells must remain visible in guidance');
  const universalWithoutSpecialty = buildUniversalReportIntelligence({
    sourcePath: 'unclassified-operational-data.csv',
    sourceHash: 'sha256:' + 'c'.repeat(64),
    reportJobId: 'generic-file-contract-job',
    tenantId: 'generic-file-contract-tenant',
    rowCount: unclassifiedDataset.rowCount,
    sourceAnalysis: { datasets: [unclassifiedDataset] },
    canonicalRows: unclassifiedDataset.rows.map((data, index) => ({ row_number: index + 1, data })),
    generalIntelligence: unclassifiedGeneric,
  });
  assert.equal(universalWithoutSpecialty.archetype, null, 'a generic source without a valid specialist fingerprint must remain unclassified');
  assert.ok(universalWithoutSpecialty.intelligence.signals.some((signal) => signal.id === 'generic:table:structure'), 'generic source structural analysis must remain visible without a specialist');
  assert.ok(universalWithoutSpecialty.intelligence.findings.some((finding) => finding.id === 'generic:table:profile'), 'generic source findings must remain available without a specialist');
  assert.ok(universalWithoutSpecialty.intelligence.recommendations.some((item) => item.id === 'generic:table:validate-profile'), 'generic review recommendation must remain available without a specialist');
  assert.ok(universalWithoutSpecialty.intelligence.summary.length > 20, 'universal analysis must return a useful source-derived summary when no archetype is applicable');

  // Real XLSX regression: customer portfolio + eight monthly measures.
  // The report should map the observed semantics, summarize the table and expose
  // evidence-backed customer-status, monthly-trend and reconciliation signals.
  const monthlyNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس'];
  const portfolioRows = [
    {
      'اسم العميل': 'عميل مستمر',
      'يناير': 100, 'فبراير': 120, 'مارس': 110, 'أبريل': 130,
      'مايو': 140, 'يونيو': 150, 'يوليو': 160, 'أغسطس': 180,
      'الإجمالي الكلي': 1090, 'حالة الزبون': 'مستمر',
      'تصنيف الأهمية (ABC)': 'الفئة أ (كبار العملاء)',
      'مؤشر المخاطر والفرص': 'منتظم مستمر', 'عدد أشهر التعامل': 8,
      'متوسط الشهر الفعلي': 136.25, 'الشهر الأعلى شراءً': 'أغسطس',
      'نسبة النمو (يوليو-أغسطس)': 0.125,
    },
    {
      'اسم العميل': 'عميل منقطع مهم',
      'يناير': 20, 'فبراير': 0, 'مارس': 0, 'أبريل': 30,
      'مايو': 0, 'يونيو': 0, 'يوليو': 0, 'أغسطس': 0,
      'الإجمالي الكلي': 65, 'حالة الزبون': 'منقطع',
      'تصنيف الأهمية (ABC)': 'الفئة أ (كبار العملاء)',
      'مؤشر المخاطر والفرص': 'خطر انقطاع (VIP)', 'عدد أشهر التعامل': 2,
      'متوسط الشهر الفعلي': 25, 'الشهر الأعلى شراءً': 'أبريل',
      'نسبة النمو (يوليو-أغسطس)': -1,
    },
    {
      'اسم العميل': 'عميل آخر',
      'يناير': 10, 'فبراير': 20, 'مارس': 30, 'أبريل': 40,
      'مايو': 50, 'يونيو': 60, 'يوليو': 70, 'أغسطس': 80,
      'الإجمالي الكلي': 360, 'حالة الزبون': 'مستمر',
      'تصنيف الأهمية (ABC)': 'الفئة ب', 'مؤشر المخاطر والفرص': 'نشاط معتاد',
      'عدد أشهر التعامل': 8, 'متوسط الشهر الفعلي': 45,
      'الشهر الأعلى شراءً': 'أغسطس', 'نسبة النمو (يوليو-أغسطس)': 0.1429,
    },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(portfolioRows), 'ملخص العملاء');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const xlsxBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const parsedPortfolio = await parseFile(xlsxBuffer, 'customer-portfolio.xlsx', 'xlsx');
  assert.equal(parsedPortfolio.length, 1, 'customer portfolio workbook should parse as one dataset');
  assert.equal(parsedPortfolio[0].rowCount, 3, 'all customer records must be preserved');
  assert.equal(parsedPortfolio[0].columnCount, 17, 'all original workbook columns must be preserved');
  assert.equal(parsedPortfolio[0].columns.filter(column => column.mappedField).length, 17, 'Arabic customer portfolio fields should receive semantic mappings');
  assert.equal(parsedPortfolio[0].columns.reduce((sum, column) => sum + column.qualityIssues.length, 0), 0, 'unknown semantics alone must not be counted as data-quality defects');
  assert.equal(parsedPortfolio[0].columns.find(column => column.name === 'حالة الزبون')?.mappedField, 'customer_status');
  assert.equal(parsedPortfolio[0].columns.find(column => column.name === 'أغسطس')?.mappedField, 'monthly_sales_aug');
  const portfolioIntelligence = buildGenericFileIntelligence(parsedPortfolio[0], 'xlsx');
  assert.ok(portfolioIntelligence.summary.includes('٣') || portfolioIntelligence.summary.includes('3'), 'structured Excel summary must report source row count');
  assert.ok(portfolioIntelligence.signals.some(signal => signal.id === 'generic:table:source-status'), 'source-disconnected status should create a specific evidence-backed signal');
  assert.ok(portfolioIntelligence.recommendations.some(item => item.id === 'generic:table:reconcile-totals'), 'monthly-to-total mismatch must produce a reconciliation recommendation');
  assert.ok(portfolioIntelligence.recommendations.some(item => item.id === 'generic:table:review-monthly-change'), 'monthly source values must be compared across periods');
  assert.ok(portfolioIntelligence.guidance.inspect.some(item => item.includes('عميل مستمر') || item.includes('عميل منقطع مهم')), 'top customer rows should appear as evidence');
  const lateNumericProfile = portfolioIntelligence.guidance.inspect.find(item => item.includes('نسبة النمو (يوليو-أغسطس)'));
  assert.ok(lateNumericProfile, 'numeric profile must include numeric fields after the first five columns');
  assert.ok(lateNumericProfile.includes('المتوسط الحسابي') && lateNumericProfile.includes('الأدنى') && lateNumericProfile.includes('الأعلى') && lateNumericProfile.includes('سجل'), 'every numeric field should expose descriptive statistics and source-record evidence');
  const structureSignal = portfolioIntelligence.signals.find(signal => signal.id === 'generic:table:structure');
  assert.ok(structureSignal?.evidence.some(item => item.includes('نسبة النمو (يوليو-أغسطس)')), 'signal evidence must not lose later numeric fields');

  const sourceBoundPreview = {
    ...portfolioIntelligence,
    businessQuestion: 'سؤال محفظة العملاء من نفس الصفوف المصدرية',
    summary: 'تحليل محفظة العملاء مع دليل الحالات الشهرية',
  };
  const universalPortfolio = buildUniversalReportIntelligence({
    specialty: 'sales',
    archetypeHintId: 'customers.activity',
    previewIntelligence: sourceBoundPreview,
    rowCount: parsedPortfolio[0].rowCount,
    sourceAnalysis: { datasets: [parsedPortfolio[0]] },
    canonicalRows: parsedPortfolio[0].rows.map((data, index) => ({ row_number: index + 1, data })),
    sourcePath: 'customer-portfolio.xlsx',
    sourceHash: 'test-source-hash',
  });
  assert.strictEqual(universalPortfolio.intelligence, sourceBoundPreview, 'decision chain must reuse the source-bound portfolio analysis object');
  assert.equal(universalPortfolio.intelligence.businessQuestion, 'سؤال محفظة العملاء من نفس الصفوف المصدرية');
  assert.equal(universalPortfolio.archetype?.id, 'customers.activity', 'customer portfolio archetype must be preserved');
  assert.ok(
    !universalPortfolio.stages.some(stage => stage.evidence.some(item => item.includes('dateField=missing'))),
    'stale generic date-missing evidence must not override the source-bound analysis',
  );

  const generalOnlySignal = portfolioIntelligence.signals.find(signal => signal.id === 'generic:table:source-status');
  assert.ok(generalOnlySignal, 'general layer must include a source-derived status signal');
  const sharedSignal = portfolioIntelligence.signals.find(signal => signal.id !== generalOnlySignal.id);
  assert.ok(sharedSignal, 'general layer must have a second signal to test overlap');
  const sharedId = sharedSignal.id;
  const generalOnlyRecommendation = portfolioIntelligence.recommendations.find(item => item.id === 'generic:table:reconcile-totals');
  assert.ok(generalOnlyRecommendation, 'general layer must include its source-derived totals reconciliation recommendation');
  const specialistEvidence = 'specialist-proof=customer-activity';
  const generalEvidence = 'general-proof=raw-source-content';
  const specialistLayer = {
    ...sourceBoundPreview,
    businessQuestion: 'السؤال المتخصص يجب أن يبقى ظاهرًا',
    summary: 'التحليل المتخصص',
    signals: [
      { ...sharedSignal, title: 'الإشارة المتخصصة', evidence: [specialistEvidence] },
      {
        id: 'specialty:customer-activity:source-bound',
        severity: 'medium',
        title: 'إشارة متخصصة مستقلة',
        message: 'تظهر فقط في الطبقة المتخصصة',
        evidence: ['specialtyRow=2'],
        soWhat: 'مراجعة خاصة بالشكل المكتشف',
        impact: 'لا يثبت أثرًا ماليًا',
        ownerHint: 'مراجع التقرير',
        priority: 'P2',
        priorityReason: ['specialtySupported=true'],
      },
    ],
    recommendations: [
      { ...sourceBoundPreview.recommendations[0], id: 'specialty:customer-activity:review', title: 'توصية متخصصة' },
    ],
    findings: [],
    risks: [],
    opportunities: [],
  };
  const generalWithProof = {
    ...portfolioIntelligence,
    signals: portfolioIntelligence.signals.map(signal => signal.id === sharedId
      ? { ...signal, evidence: [...signal.evidence, generalEvidence] }
      : signal),
  };
  const composed = composeIntelligenceLayers(generalWithProof, specialistLayer);
  const sharedMergedSignal = composed.signals.find(signal => signal.id === sharedId);
  assert.ok(sharedMergedSignal, 'merged result must preserve overlapping source signal');
  assert.equal(sharedMergedSignal.title, 'الإشارة المتخصصة', 'specialist interpretation wins for a shared stable ID');
  assert.ok(sharedMergedSignal.evidence.includes(generalEvidence), 'general evidence must survive composition');
  assert.ok(sharedMergedSignal.evidence.includes(specialistEvidence), 'specialist evidence must survive composition');
  assert.ok(composed.signals.some(signal => signal.id === generalOnlySignal.id), 'general-only signals must survive when specialty is present');
  assert.ok(composed.signals.some(signal => signal.id === 'specialty:customer-activity:source-bound'), 'specialist-only signals must survive composition');
  assert.ok(composed.recommendations.some(item => item.id === generalOnlyRecommendation.id), 'general-only recommendations must remain available');
  assert.ok(composed.recommendations.some(item => item.id === 'specialty:customer-activity:review'), 'specialist recommendations must be added, not substituted');
  assert.equal(composed.businessQuestion, 'السؤال المتخصص يجب أن يبقى ظاهرًا', 'specialist business question remains primary');

  const canonicalSelection = selectGenericSourceRows({
    canonicalRows: [{ value: 'canonical' }],
    sourceDataset: { rowCount: 1, rows: [{ value: 'snapshot' }] },
    sourceDatasetCount: 1,
    sourceAnalysisRowCount: 1,
  });
  assert.equal(canonicalSelection.origin, 'canonical', 'canonical database rows always take precedence over snapshots');
  assert.equal(canonicalSelection.rows[0].value, 'canonical', 'canonical source data cannot be replaced by snapshot preview');

  const completeSnapshotSelection = selectGenericSourceRows({
    canonicalRows: [],
    sourceDataset: { rowCount: 2, rows: [{ value: 10 }, { value: 20 }] },
    sourceDatasetCount: 1,
    sourceAnalysisRowCount: 2,
  });
  assert.equal(completeSnapshotSelection.origin, 'source-analysis-snapshot', 'a complete source-bound snapshot can keep general analysis available when canonical rows are missing');
  assert.equal(completeSnapshotSelection.rows.length, 2, 'the snapshot fallback must retain every proven source row');

  const incompleteSnapshotSelection = selectGenericSourceRows({
    canonicalRows: [],
    sourceDataset: { rowCount: 3, rows: [{ value: 10 }] },
    sourceDatasetCount: 1,
    sourceAnalysisRowCount: 3,
  });
  assert.equal(incompleteSnapshotSelection.origin, 'unavailable', 'a small preview must never masquerade as a complete report');
  assert.equal(incompleteSnapshotSelection.rows.length, 0, 'incomplete snapshots must not emit derived results');

  const inconsistentSnapshotSelection = selectGenericSourceRows({
    canonicalRows: [],
    sourceDataset: { rowCount: 2, rows: [{ value: 10 }, { value: 20 }] },
    sourceDatasetCount: 1,
    sourceAnalysisRowCount: 3,
  });
  assert.equal(inconsistentSnapshotSelection.origin, 'unavailable', 'conflicting snapshot and import row counts must fail closed');

  console.log('GENERIC FILE ANALYSIS PASS');
  console.log('SOURCE-BOUND ROW SELECTOR PASS canonical-priority/complete-snapshot/partial-preview/count-mismatch');
  console.log('STRUCTURED XLSX CUSTOMER PORTFOLIO PASS rows=3 columns=17 mapped=17 status/trend/reconciliation');
}

await main();