import assert from 'node:assert/strict';
import fs from 'node:fs';

const reports = fs.readFileSync('src/pages/ReportsPage.tsx', 'utf8');
const surface = fs.readFileSync('src/components/CustomerReportSurface.tsx', 'utf8');
const smart = fs.readFileSync('src/pages/SmartReportPage.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const reportSourceContext = fs.readFileSync('src/components/ReportSourceContext.tsx', 'utf8');
const fullProductBrowserWorkflow = fs.readFileSync('.github/workflows/full-product-browser-e2e.yml', 'utf8');

const generic = fs.readFileSync('src/components/GenericFileIntelligenceCard.tsx', 'utf8');
const chain = fs.readFileSync('src/components/UniversalIntelligenceChain.tsx', 'utf8');

assert.ok(generic.includes('data-testid="generic-intelligence-results-navigation"'), 'Generic analysis must expose an accessible in-card index for all result groups');
assert.ok(generic.includes("id: 'generic-intelligence-signals'") && generic.includes("id: 'generic-intelligence-recommendations'"), 'Signals and recommendations must be reachable from the results index');
assert.ok(generic.includes("id: 'generic-intelligence-findings'") && generic.includes("id: 'generic-intelligence-risks'") && generic.includes("id: 'generic-intelligence-opportunities'"), 'Facts, risks, and opportunities must remain explicit result groups');
assert.ok(generic.includes("id: 'generic-intelligence-inspect'"), 'Additional source checks must be reachable even when none are available');
assert.ok(generic.includes('هذه حالة نتائج فارغة وليست دليلًا على خلو المصدر من المخاطر'), 'An empty result category must not be represented as proof that no risk exists');
assert.ok(generic.includes('generic-intelligence-inspect-empty'), 'The inspection group must display an explicit empty state rather than disappear');

assert.ok(reports.includes("import { CustomerReportSurface } from '@/components/CustomerReportSurface';"));
assert.ok(reports.includes("import { SourceContextNavigation } from '@/components/ReportSourceContext';"), 'Reports center must render the source-bound navigation on its actual report surface');
assert.ok(reports.includes('<div data-testid="reports-center-source-navigation"'), 'Reports center must expose a visible navigation container within the current report card');
assert.ok(reports.includes('<SourceContextNavigation jobId={primarySmartReport.jobId} sourceHash={primarySmartReport.sourceHash} variant="dark" />'), 'Reports-center shortcuts must carry the primary report exact job id and source hash');
assert.ok(reports.includes('return <CustomerReportSurface report={report} expectedSpecialty={expectedSpecialty} title={title} />;'));
assert.ok(!reports.includes('{report.sourcePath}</div>'));
assert.ok(!reports.includes('title={report.sourcePath}>{report.sourcePath}'));
assert.ok(reports.includes('data-testid="smart-report-catalog-tools"'), 'Smart report catalog must expose its real search/filter control surface');
assert.ok(reports.includes('aria-label="بحث في التقارير الذكية"'), 'Smart report search must be accessible');
assert.ok(reports.includes("const SMART_REPORT_CATALOG_PAGE_SIZE = 9;"), 'Catalog must show a compact local page instead of flooding the screen with every report at once');
assert.ok(reports.includes('visibleSmartReports.map((report, reportIndex)'), 'Visible cards must be driven by filtered local results');
assert.ok(reports.includes('data-testid="smart-report-local-pagination"'), 'Catalog must provide accessible local previous/next controls');
assert.ok(reports.includes('title={report.sourceHash}>{report.sourceHash.slice(0, 24)}…</div>'), 'Compact cards must retain the source fingerprint in place of an unavailable period claim');
assert.ok(!reports.includes('report.archetypeId +'));
assert.ok(surface.includes('الأرقام التي تهم القرار'));
assert.ok(surface.includes('ماذا يعني التقرير للإدارة؟'));
assert.ok(surface.includes('ما يراه العميل هنا هو معنى التقرير وقرار الأعمال'));
assert.ok(surface.includes('تفاصيل المصدر عند الحاجة فقط'));
assert.ok(surface.includes('sourcePath={report.sourcePath}'), 'Generic intelligence must retain the source identity as a component prop');
const customerSurfaceWithoutSourceProp = surface.replace(/sourcePath=\{report\.sourcePath\}/g, 'sourcePath={sourcePathProp}');
assert.ok(!customerSurfaceWithoutSourceProp.includes('{report.sourcePath}'), 'Customer-facing report must not render the raw source path directly');
assert.ok(!surface.includes('report.archetypeId'));
assert.ok(smart.includes('displayColumnLabel'));
assert.ok(smart.includes('التقرير الذكي'));
assert.ok(smart.includes("report.specialty === 'sales' ? 'المبيعات'"));
assert.ok(app.includes("if (authQuery) return <AuthGate><AppShell /></AuthGate>;"), 'AUTH_QUERY_MUST_OPEN_THE_PROTECTED_WORKSPACE_AFTER_LOGIN');
assert.ok(app.includes("const isLandingPath = location.pathname === '/' || location.pathname === '';"), 'PUBLIC_PROPOSAL_DEMO_MUST_BE_LANDING_ONLY');
assert.ok(app.includes("if (demoQuery || (isLandingPath && (isNetlifyPreview || isPrimaryPublicPreview || isGitHubPagesPublicPreview))) return <ProposalDemoPage />;"), 'PUBLIC_PREVIEW_MUST_NOT_REPLACE_REPORTS_OR_SMART_REPORT_ROUTES_WITH_FIXTURE_DEMO');
assert.ok(!app.includes("if (demoQuery || isNetlifyPreview || isPrimaryPublicPreview || isGitHubPagesPublicPreview) return <ProposalDemoPage />;"), 'BROAD_PUBLIC_PREVIEW_ROUTE_OVERRIDE_FORBIDDEN');
assert.ok(reportSourceContext.includes('if (!needsContextContinuity(location.pathname)) return null;'),
  'ReportSourceContext must not render stale report content on routes without source-context continuity');
assert.ok((reportSourceContext.match(/if \(!needsContextContinuity\(location\.pathname\)/g) ?? []).length >= 3,
  'ReportSourceContext catalog, resolver, and detail effects must be scoped to context-continuity routes');
assert.ok((reportSourceContext.match(/new AbortController\(\)/g) ?? []).length >= 3,
  'Each ReportSourceContext network effect must own an abort controller');
assert.ok((reportSourceContext.match(/controller\.abort\(\)/g) ?? []).length >= 3,
  'Every ReportSourceContext request effect must abort in-flight work during cleanup');
assert.ok(reportSourceContext.includes('AbortSignal.any([controller.signal, AbortSignal.timeout(12000)])'),
  'ReportSourceContext requests must preserve timeout and cleanup cancellation');
assert.ok(reportSourceContext.includes('export function SourceContextNavigation'), 'Source-bound navigation must be reusable by the actual reports-center surface independently of report detail rendering');
assert.ok(reportSourceContext.includes("variant === 'dark'"), 'Source navigation must support readable contrast on the executive dark report card');
assert.ok(reportSourceContext.includes('data-testid="report-source-context-links"'), 'Source-context navigation must expose a stable browser-proof surface');
assert.ok(reportSourceContext.includes('if (!report && !error)'), 'Pending report-detail reads must retain navigation while they resolve');
assert.ok(reportSourceContext.includes("path: '/intelligence'"), 'Source-bound navigation must retain the intelligence route');

assert.ok(smart.includes('تصدير XLSX'));

const customerFacingSurfaces = [
  'src/pages/DashboardPage.tsx',
  'src/pages/ExecutiveCommandCenterPage.tsx',
  'src/pages/TrustEvidencePage.tsx',
  'src/pages/CanonicalImportPage.tsx',
  'src/pages/DecisionExperiencePage.tsx',
  'src/pages/DecisionInboxPage.tsx',
  'src/pages/WorkCenterPage.tsx',
  'src/pages/IntelligencePage.tsx',
  'src/components/SourceBoundReportSurface.tsx',
].map((path) => ({ path, content: fs.readFileSync(path, 'utf8') }));

const forbiddenPrimaryLabels = [
  '>WHY<',
  '>EVIDENCE<',
  '>WHAT NEXT<',
  '>OUTCOME<',
  'As-of:',
  'Source SHA:',
  'معرّف القرار:',
];

for (const { path: surfacePath, content } of customerFacingSurfaces) {
  for (const forbidden of forbiddenPrimaryLabels) {
    assert.ok(!content.includes(forbidden), surfacePath + ' must not expose primary technical label: ' + forbidden);
  }
}

assert.ok(!customerFacingSurfaces.some(({ content }) => /\b(Decision ROI|Business Replay|Money Recovery|Outcome follow-up)\b/.test(content)));
const realBusinessE2E = fs.readFileSync('scripts/real-business-e2e.mjs', 'utf8');
assert.ok(realBusinessE2E.includes('async function waitForSmartReportEvidenceSurface(page)'), 'Real business E2E must use a dedicated visible Evidence Passport proof');
assert.ok(realBusinessE2E.includes("locator('[data-testid=\"smart-report-decision-chain\"]')"), 'Real business E2E must assert the visible source-bound decision chain');
assert.ok(realBusinessE2E.includes(".filter({ hasText: 'التفاصيل الكاملة للتقرير' })"), 'Real business E2E must scope Evidence Passport to the visible details summary');
assert.ok(!realBusinessE2E.includes("getByText('EVIDENCE PASSPORT', { exact: false }).first().waitFor"), 'Real business E2E must not select a hidden duplicate Evidence Passport label');
assert.ok(!realBusinessE2E.includes("getByText('EVIDENCE PASSPORT', { exact: false }).waitFor"), 'Real business E2E must not retain a non-unique Evidence Passport locator');
assert.ok(realBusinessE2E.includes('function xlsxBuffer(input)'), 'Browser journey must generate a genuinely new XLSX fixture for parser/persistence proof');
assert.ok(realBusinessE2E.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'Fresh XLSX upload must use the correct MIME type');
assert.ok(realBusinessE2E.includes('fresh-generic-xlsx-upload'), 'Browser journey must save/read back a newly uploaded XLSX report');
assert.ok(realBusinessE2E.includes("async function waitForAuthoritativeImportCompletion(page, companyId, marker, format = 'csv')"), 'Import completion lookup must resolve CSV and XLSX filenames consistently');
assert.ok(realBusinessE2E.includes('waitForAuthoritativeImportCompletion(page, companyId, marker, format)'), 'Shared import flow must pass the actual extension to durable job discovery');
assert.ok(realBusinessE2E.includes('fresh-xlsx-upload-to-generic-intelligence-save-readback-refresh'), 'Fresh XLSX must prove generic intelligence survives persisted readback and refresh');
assert.ok(realBusinessE2E.includes("mode: 'RECOMPUTED_FROM_DURABLE_CANONICAL_ROWS'"), 'Generic post-refresh proof must state that intelligence is recomputed from persisted source rows instead of falsely claiming a separately serialized result');
assert.ok(realBusinessE2E.includes('signalCountAfterRefresh'), 'Generic signal count must be asserted again after refresh');
assert.ok(realBusinessE2E.includes('recommendationCountAfterRefresh'), 'Generic recommendation count must be asserted again after refresh');
assert.ok(realBusinessE2E.includes('genericSignalCount: freshReport.genericSurfaceProof.signalCountAfterRefresh'), 'Artifacts must record the actual refreshed UI signal count');
assert.ok(realBusinessE2E.includes('genericRecommendationCount: freshReport.genericSurfaceProof.recommendationCountAfterRefresh'), 'Artifacts must record the actual refreshed UI recommendation count');
assert.ok(!realBusinessE2E.includes("scripts/real-48-archetype-proof.mjs"), 'Single-tenant 48-archetype diagnostic must not fail an otherwise completed customer journey');
assert.ok(fullProductBrowserWorkflow.includes('Diagnose optional real-source coverage for 48 specialist archetypes'), 'The governed multi-tenant source matrix must remain available as a specialist diagnostic');
assert.ok(fullProductBrowserWorkflow.includes("scripts/real-48-source-matrix-preflight.mjs"), 'Specialist coverage must still execute the governed source preflight');
assert.ok(fullProductBrowserWorkflow.includes("'artifacts/e2e-business/real-48-source-matrix-preflight.json'"), 'Specialist coverage evidence must still be emitted for inspection');
assert.ok(fullProductBrowserWorkflow.includes("REAL_SOURCE_MATRIX_DIAGNOSTIC_ONLY: '1'"), 'The full-product journey must explicitly opt into diagnostic-only specialist coverage');
assert.ok(fullProductBrowserWorkflow.includes('UNIVERSAL_BROWSER_PROOF_GATE=PASS'), 'Universal file acceptance must still fail closed on actual browser/report proof');
const universalGateStart = fullProductBrowserWorkflow.indexOf('Fail closed on universal browser evidence');
const universalGateEnd = fullProductBrowserWorkflow.indexOf('Upload browser proof artifacts', universalGateStart);
assert.ok(universalGateStart >= 0 && universalGateEnd > universalGateStart, 'Universal browser gate must be present and bounded');
const universalGate = fullProductBrowserWorkflow.slice(universalGateStart, universalGateEnd);
assert.ok(!universalGate.includes('real-48-source-matrix-preflight.json'), 'Specialist coverage must not block generic file analysis');
assert.ok(reports.includes('export function SalesReportPage'), 'Sales report surface must remain present');
assert.ok(reports.includes('export function PurchasesReportPage'), 'Purchases report surface must remain present');
const salesBlock = reports.slice(reports.indexOf('export function SalesReportPage'), reports.indexOf('export function PurchasesReportPage'));
const purchasesBlock = reports.slice(reports.indexOf('export function PurchasesReportPage'), reports.indexOf('export function InventoryReportPage'));
assert.ok(!salesBlock.includes('fetchDashboardSnapshot(6)'), 'Sales report must not depend on the global dashboard snapshot RPC');
assert.ok(!purchasesBlock.includes('fetchDashboardSnapshot(6)'), 'Purchases report must not depend on the global dashboard snapshot RPC');
console.log('DOMAIN_REPORT_DIRECT_DATA_CONTRACT_PASS');

console.log('CUSTOMER_FACING_REPORT_SURFACE_CONTRACT_PASS');

// Visual direction contract: dark ink + restrained indigo/brass, with readable elevation.
assert.ok(surface.includes('bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,.24),transparent_34%),linear-gradient(135deg,#090f1e_0%,#111a2e_56%,#1d2140_100%)]'), 'Customer report hero must retain the dark-indigo executive visual system');
assert.ok(surface.includes('shadow-[0_12px_35px_-28px_rgba(15,23,42,.45)]'), 'Primary report surfaces need restrained layered elevation');
assert.ok(generic.includes('shadow-[0_18px_52px_-42px_rgba(15,23,42,.55)]'), 'Generic intelligence must read as a primary analysis surface');
assert.ok(generic.includes('hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md'), 'Signal cards need deliberate hover affordance');
assert.ok(chain.includes('bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,.26),transparent_40%),linear-gradient(135deg,#090f1e_0%,#141c32_64%,#212348_100%)]'), 'Universal intelligence executive signal must use the shared dark-indigo treatment');
assert.ok(chain.includes('border-primary-200 bg-primary-50 text-primary-900'), 'Verified source states should use restrained indigo instead of green-heavy accents');
assert.ok(!chain.includes('border-emerald-200 bg-emerald-50 text-emerald-900'), 'Remove green-heavy verified status styling from the intelligence chain');
