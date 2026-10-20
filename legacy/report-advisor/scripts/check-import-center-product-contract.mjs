import fs from 'node:fs';

const entry = fs.readFileSync('src/pages/ImportPage.tsx', 'utf8');
const legacyFolderImporterPaths = [
  'src/components/FolderBatchImportPanel.tsx',
  'src/lib/import/batch-folder.ts',
  'src/lib/import/batch-folder.lifecycle.test.ts',
  'src/lib/import/batch-folder.validation.test.ts',
  'scripts/check-folder-batch-import.mjs',
];

const page = fs.readFileSync('src/pages/CanonicalImportPage.tsx', 'utf8');
const dataTable = fs.readFileSync('src/components/ui/DataTable.tsx', 'utf8');
const adapter = fs.readFileSync('src/lib/import/canonical-production-adapter.ts', 'utf8');
const requiredPage = [
  'مركز المصادر',
  'Stepper',
  'securityScan',
  'computeSHA256',
  'checkDuplicate',
  'reconcileForCanonical',
  'runCanonicalImportThroughDurableRunner',
  'أمان: ناجح',
  'الكتابة متوقفة لحماية البيانات',
  'اعتماد المصدر',
  'سجل الاستيرادات',
  'لن يتم حفظ نسخة تحليل مكررة',
  'invalidRows: 0',
  'invalidRows: rows.length - validRows.length',
  'describeImportFailure',
  'لم يكتمل التنفيذ الخادمي',
  'العطل الفعلي:',
  'تحديث سجل العمليات',
  'pageSize={50}',
];
const requiredAdapter = [
  'runCanonicalImportThroughDurableRunner',
  'runDurableProductionLifecycle',
  'commitImportBatch',
  "stage === 'committed'",
];

const forbiddenEntryTokens = [
  'FolderBatchImportPanel',
  'sales_invoices',
  'products',
  'customers',
  'entityType',
];

const legacyFolderImporterStillPresent = legacyFolderImporterPaths.filter(path => fs.existsSync(path));
if (legacyFolderImporterStillPresent.length) {
  console.error(`Import Center product contract failed. Legacy specialized folder importer files still exist: ${legacyFolderImporterStillPresent.join(', ')}`);
  process.exit(1);
}
const missingPage = requiredPage.filter(token => !page.includes(token));
const missingAdapter = requiredAdapter.filter(token => !adapter.includes(token));
if (forbiddenEntryTokens.some(token => entry.includes(token))) {
  const found = forbiddenEntryTokens.filter(token => entry.includes(token));
  console.error(`Import Center product contract failed. Unified /import entry exposes forbidden specialization or legacy folder importer: ${found.join(', ')}`);
  process.exit(1);
}

const requiredDataTable = ['pageSize', 'effectivePageSize', 'visibleRows', 'تنقّل الجدول', 'الصفحة التالية', 'الصفحة السابقة'];
const missingDataTable = requiredDataTable.filter(token => !dataTable.includes(token));

if (missingPage.length || missingAdapter.length || missingDataTable.length) {
  const missing = [
    ...missingPage.map(token => `page:${token}`),
    ...missingAdapter.map(token => `adapter:${token}`),
    ...missingDataTable.map(token => `table:${token}`),
  ];
  console.error(`Import Center product contract failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}

if (/Math\.random|fake|mock/i.test(page)) {
  console.error('Import Center product contract failed: synthetic/mock content detected.');
  process.exit(1);
}

console.log('Import Center product contract: PASS (UI delegates to canonical durable import; authoritative commit remains at committed lifecycle stage).');