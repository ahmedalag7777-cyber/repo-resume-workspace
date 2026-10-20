import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/SmartReportAdvisorySurface.tsx', import.meta.url), 'utf8');

for (const marker of [
  'report.intelligence.signals.length',
  'report.intelligence.recommendations.length',
  'report.intelligence.forecast.status',
  'report.intelligence.guidance.focus',
  'كل الإشارات والتنبيهات',
  'كل التوصيات المؤهلة',
  'الإشارة التنبئية',
  'الإرشاد التالي',
  'لماذا الآن:',
  'المخاطر:',
  'العائق:',
  'القياس:',
  'الحدود:',
]) {
  if (!source.includes(marker)) throw new Error('Missing complete smart intelligence surface marker: ' + marker);
}

const signalStart = source.indexOf('الإشارات');
const recommendationStart = source.indexOf('التوصيات');
const forecastStart = source.indexOf('التنبؤ');
if (signalStart < 0 || recommendationStart < 0 || forecastStart < 0) throw new Error('Missing Arabic intelligence surface section boundaries');
const signalBlock = source.slice(signalStart, recommendationStart);
const recommendationBlock = source.slice(recommendationStart, forecastStart);
if (signalBlock.includes('signals.slice(')) throw new Error('Signals must not be artificially truncated');
if (recommendationBlock.includes('recommendations.slice(')) throw new Error('Recommendations must not be artificially truncated');

const reportIntelligencePanel = fs.readFileSync(new URL('../src/components/ReportIntelligencePanel.tsx', import.meta.url), 'utf8');
const customerReportSurface = fs.readFileSync(new URL('../src/components/CustomerReportSurface.tsx', import.meta.url), 'utf8');
if (!customerReportSurface.includes('data-testid="customer-report-source-hash"') || !customerReportSurface.includes('{report.sourceHash}')) throw new Error('Domain report surfaces must visibly expose the complete source SHA-256 fingerprint');
if (!customerReportSurface.includes('SOURCE-BOUND DOMAIN ANALYSIS') || !customerReportSurface.includes('هذه الشاشة مربوطة مباشرة بنتيجة التقرير')) throw new Error('Domain report surfaces must visibly declare source-bound analysis context');
for (const marker of [
  "import { GenericFileIntelligenceCard } from '@/components/GenericFileIntelligenceCard';",
  "import { ReportIntelligencePanel } from '@/components/ReportIntelligencePanel';",
  'data-testid="customer-report-general-intelligence"',
  'intelligence={report.genericIntelligence}',
  "format={report.sourceAnalysis?.sourceFormat ?? 'generic'}",
  'sourcePath={report.sourcePath}',
  'sourceHash={report.sourceHash}',
  'reportJobId={report.jobId}',
  'analysisScope={report.canonicalAnalysisScope}',
  "analysisSource={report.canonicalRows.length === 0 && report.genericIntelligence ? 'source-analysis-snapshot' : 'canonical'}",
  '<ReportIntelligencePanel report={report} />',
]) {
  if (!customerReportSurface.includes(marker)) throw new Error('Inventory domain route must render source-bound universal/general intelligence: ' + marker);
}
if (customerReportSurface.includes('{!report.specialty && <GenericFileIntelligenceCard')) {
  throw new Error('General intelligence must remain visible when a specialty exists');
}
if (!reportIntelligencePanel.includes('>GUIDANCE</span>')) throw new Error('Guidance contract must be visible text in the intelligence panel, not only a data attribute');
if (!reportIntelligencePanel.includes('ذكاء المصدر')) throw new Error('Arabic source-intelligence heading must remain visible beside the guidance label');
if (!reportIntelligencePanel.includes('>EVIDENCE PASSPORT</span>')) throw new Error('Evidence passport must be visibly labelled on every source-bound intelligence surface');
const sourceBoundReportSurface = fs.readFileSync(new URL('../src/components/SourceBoundReportSurface.tsx', import.meta.url), 'utf8');
if (!sourceBoundReportSurface.includes('data-testid="source-bound-report-source-hash"') || !sourceBoundReportSurface.includes('SHA-256: {report.sourceHash}')) throw new Error('Every source-bound linked surface must visibly expose the full source SHA-256 fingerprint');
const authenticatedBrowserProof = fs.readFileSync(new URL('../scripts/real-business-e2e.mjs', import.meta.url), 'utf8');
if (!authenticatedBrowserProof.includes("const guidanceLabel = page.getByText('GUIDANCE', { exact: true });")
  || !authenticatedBrowserProof.includes("assert.equal(await guidanceLabel.isVisible(), true")) {
  throw new Error('Authenticated browser proof must verify visible GUIDANCE text, not only a DOM text snapshot');
}

console.log('smart-report-complete-intelligence-surface: PASS');

const smartReportPage = fs.readFileSync(new URL('../src/pages/SmartReportPage.tsx', import.meta.url), 'utf8');
if (!smartReportPage.includes("GenericFileIntelligenceCard")) throw new Error('Smart Report page must expose source-agnostic intelligence');
if (!smartReportPage.includes('data-testid="smart-report-generic-intelligence"')) throw new Error('Smart Report generic intelligence test marker missing');
if (!smartReportPage.includes('intelligence={report.genericIntelligence}')) throw new Error('Smart Report must render only the independent general intelligence layer, never label specialty results as generic');
if (!smartReportPage.includes('analysisScope={report.canonicalAnalysisScope}')) throw new Error('Smart Report must expose canonical source coverage to the general intelligence surface');
if (!smartReportPage.includes("analysisSource={report.canonicalRows.length === 0 && report.genericIntelligence ? 'source-analysis-snapshot' : 'canonical'}")) throw new Error('Smart Report must identify source-snapshot fallback separately from canonical analysis');
const genericCardUnavailableUi = fs.readFileSync(new URL('../src/components/GenericFileIntelligenceCard.tsx', import.meta.url), 'utf8');
if (!genericCardUnavailableUi.includes('data-testid="generic-intelligence-unavailable"')) throw new Error('Missing explicit unavailable state when source-bound general analysis cannot be derived');
if (!genericCardUnavailableUi.includes('data-testid="generic-intelligence-analysis-scope"')) throw new Error('Missing explicit warning for partial or extraction-snapshot analysis');

if (!smartReportPage.includes('sourceHash={report.sourceHash}') || !smartReportPage.includes('reportJobId={report.jobId}')) throw new Error('Generic intelligence card must retain report source lineage');
if (!smartReportPage.includes('generalIntelligence: report.genericIntelligence ?? undefined')) throw new Error('Persisted universal evidence chain must include the same report general layer');
if (smartReportPage.includes('{!report.specialty && (')) throw new Error('General intelligence must render even when a specialty is detected');

const uploadPage = fs.readFileSync(new URL('../src/pages/ExternalFileAnalysisPage.tsx', import.meta.url), 'utf8');
if (!uploadPage.includes('buildGenericFileIntelligence(dataset')) throw new Error('File Lab must run generic analysis for every recognized dataset');
if (!uploadPage.includes('generalIntelligence: genericIntelligence ?? undefined')) throw new Error('File Lab must merge general intelligence into the universal chain');
if (!uploadPage.includes('sourceHash={file.hash}')) throw new Error('File Lab generic results must show the uploaded source hash');

const genericCard = fs.readFileSync(new URL('../src/components/GenericFileIntelligenceCard.tsx', import.meta.url), 'utf8');
for (const marker of ['signals.map((signal)', 'recommendations.map((recommendation)', 'signal.evidence ?? []', 'recommendation.evidence ?? []', 'const inspections = intelligence.guidance.inspect ?? []', 'inspections.map((item, index)', 'data-testid="generic-intelligence-inspect-empty"', 'finding.evidence ?? []', 'generic-intelligence-source-lineage']) {
  if (!genericCard.includes(marker)) throw new Error('Generic intelligence card must expose all source-derived results/evidence: ' + marker);
}
for (const marker of ['evidence.slice(', 'signals.slice(', 'recommendations.slice(', 'guidance.inspect.slice(']) {
  if (genericCard.includes(marker)) throw new Error('Generic intelligence card must not truncate result collections: ' + marker);
}

const genericEngine = fs.readFileSync(new URL('../src/lib/file-engine/generic-intelligence.ts', import.meta.url), 'utf8');
if (genericEngine.includes('numericColumns.slice(0, 5)')) throw new Error('Generic table intelligence must not silently omit numeric fields beyond the first five');
if (!genericEngine.includes('const numericSummary = numericColumns.map')) throw new Error('Every source numeric column must receive a complete descriptive profile');
if (!genericEngine.includes('hasLineOrdinal') || !genericEngine.includes('hasLineContent')) throw new Error('Document line/text adapters must retain text evidence rather than becoming synthetic business tables');

function assertUniversalChainExpandedByDefault(pageSource, pageName) {
  const chainPosition = pageSource.indexOf('<UniversalIntelligenceChain result={universalIntelligence}');
  if (chainPosition < 0) throw new Error(pageName + ' must render the unified intelligence chain');
  const disclosureStart = pageSource.lastIndexOf('<details', chainPosition);
  const openingTagEnd = pageSource.indexOf('>', disclosureStart);
  const openingTag = disclosureStart >= 0 && openingTagEnd >= 0 ? pageSource.slice(disclosureStart, openingTagEnd + 1) : '';
  if (!/\bopen\b/.test(openingTag)) throw new Error(pageName + ' must show the complete unified intelligence chain expanded by default');
}
assertUniversalChainExpandedByDefault(smartReportPage, 'Smart Report');
assertUniversalChainExpandedByDefault(uploadPage, 'File Lab');

const universalChain = fs.readFileSync(new URL('../src/components/UniversalIntelligenceChain.tsx', import.meta.url), 'utf8');
if (universalChain.includes('item.evidence.slice(0, 3)')) throw new Error('Universal intelligence chain must not hide available stage evidence');

const reportSmartForGeneric = fs.readFileSync(new URL('../src/lib/report-smart.ts', import.meta.url), 'utf8');
if (!reportSmartForGeneric.includes('composeIntelligenceLayers(genericIntelligence, intelligence)')) throw new Error('Persisted reports must compose general and applicable specialist intelligence');
if (!reportSmartForGeneric.includes('genericIntelligence: ReportIntelligence | null')) throw new Error('Smart Report detail must return the general intelligence layer separately');
if (!reportSmartForGeneric.includes('intelligence = baseIntelligence;')) throw new Error('A failed specialist eligibility gate must preserve review state while allowing general analysis');

const composer = fs.readFileSync(new URL('../src/lib/report-intelligence/compose-intelligence-layers.ts', import.meta.url), 'utf8');
for (const marker of ['mergeSignals', 'mergeRecommendations', 'uniqueStrings([...(existing.evidence ?? []), ...(incoming.evidence ?? [])])', 'moreCautiousHealth']) {
  if (!composer.includes(marker)) throw new Error('General/specialist layer composition guard missing: ' + marker);
}

const cardComponent = fs.readFileSync(new URL('../src/components/ui/Card.tsx', import.meta.url), 'utf8');
if (!/interface CardProps extends Omit<HTMLAttributes<HTMLElement>/.test(cardComponent)) {
  throw new Error('Card must accept standard DOM attributes such as data-testid and aria-label');
}
if (!cardComponent.includes('<section') || !cardComponent.includes('{...attributes}')) {
  throw new Error('Card must forward standard DOM attributes to its rendered section');
}
if (!cardComponent.includes("import { type HTMLAttributes, type ReactNode } from 'react';")) {
  throw new Error('Card DOM attribute forwarding must remain typed');
}

console.log('smart-report-generic-intelligence-composition: PASS');

const smartReportSource = fs.readFileSync(new URL('../src/lib/report-smart.ts', import.meta.url), 'utf8');
const fetchStart = smartReportSource.indexOf('export async function fetchSmartReport');
const fetchBlock = fetchStart >= 0 ? smartReportSource.slice(fetchStart) : '';
if (!fetchBlock.includes('const resolvedSourceHash')) throw new Error('Smart report must resolve source hash from the tenant-scoped job lineage');
if (fetchBlock.includes(".eq('source_hash', sourceHash)")) throw new Error('Smart report contains an unbound sourceHash query reference');
if (!fetchBlock.includes('if (normalizedSourceHash && resolvedSourceHash !== normalizedSourceHash)')) throw new Error('Explicit source hash mismatch must still be rejected');
console.log('smart-report-context-lineage: PASS');

for (const marker of [
  'ag-report-hero-stat',
  'ag-report-tech-meta',
  'smart-report-source-hash',
  'smart-report-job-id',
  'جاهزية القرار',
  'الثقة المصدرية',
  'السجلات الموثقة',
]) {
  if (!smartReportPage.includes(marker)) throw new Error('Smart Report executive result surface marker missing: ' + marker);
}
const executiveSummaryMarker = 'data-testid="smart-report-executive-summary"';
const executiveSummaryPosition = smartReportPage.indexOf(executiveSummaryMarker);
const passportDisclosurePosition = smartReportPage.indexOf('EVIDENCE PASSPORT · المصدر · الإثبات · التفاصيل');
if (executiveSummaryPosition < 0 || passportDisclosurePosition < 0 || executiveSummaryPosition > passportDisclosurePosition) {
  throw new Error('Smart Report executive summary must render before the collapsed Evidence Passport disclosure');
}
console.log('smart-report-executive-result-surface: PASS');

const reportsPage = fs.readFileSync(new URL('../src/pages/ReportsPage.tsx', import.meta.url), 'utf8');
for (const marker of [
  "const requestedReportJobId = searchParams.get('reportJobId')?.trim() || '';",
  "const requestedSourceHash = searchParams.get('sourceHash')?.trim() || '';",
  'const selected = requestedReportJobId',
  'detail.sourceHash !== requestedSourceHash',
  '[requestedReportJobId, requestedSourceHash]',
  'REPORT_SOURCE_HASH_MISMATCH',
]) {
  if (!reportsPage.includes(marker)) throw new Error('Reports Center must preserve and validate an explicit source report context: ' + marker);
}
for (const marker of [
  'fetchSmartReportCatalogPage',
  'catalogHasMore',
  'loadMoreCatalog',
  'data-testid="smart-report-catalog-load-more"',
  "report.jobId + ':' + report.sourceHash",
]) {
  if (!reportsPage.includes(marker)) throw new Error('Missing smart report catalog pagination marker: ' + marker);
}

const reportCatalog = fs.readFileSync(new URL('../src/lib/report-smart.ts', import.meta.url), 'utf8');
if (!reportCatalog.includes('export async function fetchSmartReportCatalogPage')) throw new Error('Paged smart report catalog API missing');
if (!reportCatalog.includes('.range(offset, offset + limit)')) throw new Error('Paged smart report catalog must advance via source-job offsets');

const reportContext = fs.readFileSync(new URL('../src/components/ReportSourceContext.tsx', import.meta.url), 'utf8');
for (const marker of [
  'fetchSmartReportCatalogPage(6, 0',
  'aria-label="التقارير الذكية الأخيرة"',
  'data-testid="recent-smart-report-navigation"',
  "encodeURIComponent(item.jobId) + '?sourceHash=' + encodeURIComponent(item.sourceHash)",
  'to="/reports"',
]) {
  if (!reportContext.includes(marker)) throw new Error('Missing cross-screen smart report navigation marker: ' + marker);
}

const businessE2E = fs.readFileSync(new URL('../scripts/real-business-e2e.mjs', import.meta.url), 'utf8');
for (const marker of [
  "await importOne(pageA, 'fresh-generic-upload', freshUploadRows, freshUploadMarker)",
  "await proveSmartReportAndEvidence(pageA, evidence.tenantA, freshImport, 'fresh-generic-upload')",
  'await tagSyntheticE2EFileRecord(companyId, job.file_record_id, label)',
  "step: 'fresh-user-upload-to-generic-intelligence-save-readback-refresh'",
]) {
  if (!businessE2E.includes(marker)) throw new Error('Authenticated browser proof must exercise a fresh, source-bound upload: ' + marker);
}

const reportSmartSource = fs.readFileSync(new URL('../src/lib/report-smart.ts', import.meta.url), 'utf8');
if (!reportSmartSource.includes('selectGenericSourceRows({')) throw new Error('Saved Smart Reports must use the source-bound generic row selector');
if (!reportSmartSource.includes("selectedRows.origin === 'source-analysis-snapshot'")) throw new Error('Snapshot-derived generic intelligence must surface a review warning');
const sourceRowsSelector = fs.readFileSync(new URL('../src/lib/file-engine/generic-source-rows.ts', import.meta.url), 'utf8');
for (const marker of ['snapshotRows.length === declaredRows', "origin: 'source-analysis-snapshot'", "origin: 'unavailable'"]) {
  if (!sourceRowsSelector.includes(marker)) throw new Error('Generic source fallback must fail closed on incomplete data: ' + marker);
}

const reportsCenterPage = fs.readFileSync(new URL('../src/pages/ReportsPage.tsx', import.meta.url), 'utf8');
for (const marker of [
  'data-testid="reports-center-source-lineage"',
  'data-testid="reports-center-source-job-id"',
  'data-testid="reports-center-source-hash"',
  'data-testid="reports-center-source-path"',
  '{primarySmartReport.jobId}',
  '{primarySmartReport.sourceHash}',
  '{primarySmartReport.sourcePath}',
]) {
  if (!reportsCenterPage.includes(marker)) throw new Error('Reports Center must visibly expose its exact source lineage: ' + marker);
}
const businessE2EPostReset = fs.readFileSync(new URL('../scripts/real-business-e2e.mjs', import.meta.url), 'utf8');
if (!businessE2EPostReset.includes("const resetBody = (await page.locator('body').innerText()).trim();")) throw new Error('Reports Center source-lineage proof must read the post-reset DOM');
for (const marker of [
  "resetBody.includes(REAL_SMART_REPORT_JOB_ID)",
  "resetBody.includes(REAL_SMART_REPORT_SOURCE_HASH)",
  "resetBody.includes(REAL_SMART_REPORT_SOURCE_PATH)",
]) {
  if (!businessE2EPostReset.includes(marker)) throw new Error('Post-reset browser proof must assert visible source identity: ' + marker);
}

console.log('smart-report-catalog-navigation: PASS');
