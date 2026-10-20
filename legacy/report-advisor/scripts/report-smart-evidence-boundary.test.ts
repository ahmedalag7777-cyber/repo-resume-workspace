import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolveReportEvidenceStatus } from '../src/lib/report-smart-evidence-status.ts';

assert.equal(
  resolveReportEvidenceStatus(
    { evidenceStatus: 'AWAITING_EVIDENCE_SNAPSHOT' },
    true,
  ),
  'AWAITING_EVIDENCE_SNAPSHOT',
  'canonical commit must not promote awaiting evidence to VERIFIED',
);

assert.equal(
  resolveReportEvidenceStatus(
    { evidenceStatus: 'VERIFIED' },
    true,
  ),
  'AWAITING_EVIDENCE_SNAPSHOT',
  'a stale VERIFIED label without an evidence snapshot must fail closed',
);

assert.equal(
  resolveReportEvidenceStatus(
    { evidenceStatus: 'VERIFIED', evidenceSnapshotId: 'evidence-123' },
    true,
  ),
  'VERIFIED',
  'VERIFIED requires an explicit evidence snapshot plus canonical coverage',
);

assert.equal(
  resolveReportEvidenceStatus(
    { evidenceStatus: 'VERIFIED', evidenceSnapshotId: 'evidence-123' },
    false,
  ),
  'PENDING_EVIDENCE',
  'evidence must not verify when canonical coverage is incomplete',
);

assert.equal(
  resolveReportEvidenceStatus(
    { evidenceStatus: 'REVIEW' },
    true,
  ),
  'REVIEW',
  'review state must remain a real state',
);

assert.equal(
  resolveReportEvidenceStatus(
    { evidenceStatus: 'BLOCKED' },
    false,
  ),
  'BLOCKED',
  'blocked state must remain a real state',
);


const panelPath = fileURLToPath(new URL('../src/components/ReportIntelligencePanel.tsx', import.meta.url));
const panel = fs.readFileSync(panelPath, 'utf8');

assert.match(
  panel,
  /const evidenceSnapshotId = typeof report\.renderedOutput\?\.evidenceSnapshotId === 'string'/,
  'advisor case action must derive its decision evidence from the rendered Passport snapshot',
);
assert.match(
  panel,
  /evidenceSnapshotId,\r?\n\s*\}\);/,
  'createSourceDecisionProposal must receive the canonical Passport evidence snapshot',
);
assert.doesNotMatch(
  panel,
  /evidenceSnapshotId:\s*report\.sourceAnalysis\?\.id/,
  'analysis snapshot ids must not be used as Passport decision evidence',
);

const cockpitPath = fileURLToPath(new URL('../src/components/ReportDecisionCockpit.tsx', import.meta.url));
const cockpit = fs.readFileSync(cockpitPath, 'utf8');

assert.match(
  cockpit,
  /const evidenceSnapshotId = typeof report\.renderedOutput\?\.evidenceSnapshotId === 'string'/,
  'decision cockpit must derive its decision evidence from the rendered Passport snapshot',
);
assert.match(
  cockpit,
  /evidenceSnapshotId,\r?\n\s*\}\);/,
  'decision cockpit must pass the canonical Passport evidence snapshot',
);
assert.doesNotMatch(
  cockpit,
  /evidenceSnapshotId:\s*report\.sourceAnalysis\.id/,
  'decision cockpit must not use the analysis snapshot as Passport evidence',
);

const externalAnalysisPath = fileURLToPath(new URL('../src/pages/ExternalFileAnalysisPage.tsx', import.meta.url));
const externalAnalysis = fs.readFileSync(externalAnalysisPath, 'utf8');
assert.match(
  externalAnalysis,
  /navigate\('\/import',\s*\{ state: \{ preloadedFile: selected \} \}\)/,
  'external file analysis must hand the original File into the canonical importer instead of ending at local-only quality output',
);
assert.match(
  externalAnalysis,
  /const selectedFileRef = useRef<File \| null>\(null\)/,
  'external file analysis must preserve the selected File after clearing the input value',
);

const canonicalImportPath = fileURLToPath(new URL('../src/pages/CanonicalImportPage.tsx', import.meta.url));
const canonicalImport = fs.readFileSync(canonicalImportPath, 'utf8');
assert.match(
  canonicalImport,
  /useLocation/,
  'canonical importer must be able to consume the external-analysis handoff state',
);
assert.match(
  canonicalImport,
  /preloadedFile instanceof File/,
  'canonical importer must consume a real File object from the external-analysis handoff',
);
assert.match(
  canonicalImport,
  /void handleFile\(preloadedFile\)/,
  'canonical importer must execute the normal security, duplicate, canonicalization and smart-report path for handed-off files',
);

const smartReportPagePath = fileURLToPath(new URL('../src/pages/SmartReportPage.tsx', import.meta.url));
const smartReportPage = fs.readFileSync(smartReportPagePath, 'utf8');
assert.match(smartReportPage, /key === 'evidenceStatus' \? \(report\.evidenceStatus/, 'smart report status surface must use canonical evidence status instead of stale rendered output');
assert.match(smartReportPage, /stateLabel\(report\.evidenceStatus\)/, 'evidence inspector must use canonical report verification state');
assert.match(smartReportPage, /AWAITING_EVIDENCE_SNAPSHOT:\s*'بانتظار لقطة الدليل'/, 'pending evidence snapshot must be exposed with an explicit Arabic waiting label');
assert.match(smartReportPage, /PENDING_EVIDENCE:\s*'بانتظار الدليل'/, 'uncommitted evidence must be exposed with an explicit Arabic waiting label');
const truthStateSectionIndex = smartReportPage.indexOf('ما الذي ثبت وما الذي لم يُثبت');
const evidencePassportDisclosureIndex = smartReportPage.indexOf('EVIDENCE PASSPORT · المصدر · الإثبات · التفاصيل');
assert.ok(
  truthStateSectionIndex >= 0 && evidencePassportDisclosureIndex > truthStateSectionIndex,
  'truth-state decision summary must be rendered before the collapsed detailed evidence disclosure',
);
assert.match(smartReportPage, /<ReportIntelligencePanel report=\{report\}\s*\/>/, 'smart report must mount the intelligence panel');
assert.match(smartReportPage, /<SmartReportAdvisorySurface report=\{report\}\s*\/>/, 'smart report must mount the advisory surface');

const intelligencePanelPath = fileURLToPath(new URL('../src/components/ReportIntelligencePanel.tsx', import.meta.url));
const intelligencePanel = fs.readFileSync(intelligencePanelPath, 'utf8');
assert.match(intelligencePanel, /التنبؤ \/ الإسقاط المشروط/, 'smart report must render the forecast surface');
assert.match(intelligencePanel, /GUIDANCE/, 'smart report must render the guidance surface');
assert.match(intelligencePanel, /ما الذي ينصح به النظام؟/, 'smart report must render recommendations');
assert.doesNotMatch(intelligencePanel, /intelligence\.signals\.slice\(0,\s*8\)/, 'smart report must not silently hide source signals behind an eight-item presentation cap');
assert.match(intelligencePanel, /!evidenceSnapshotId \? 'الدليل غير متاح'/, 'case button state must use the canonical Evidence Snapshot gate');

const advisorySurfacePath = fileURLToPath(new URL('../src/components/SmartReportAdvisorySurface.tsx', import.meta.url));
const advisorySurface = fs.readFileSync(advisorySurfacePath, 'utf8');
assert.match(advisorySurface, /ADVISOR BRIEF/, 'smart report must render the advisor brief');
assert.match(advisorySurface, /TOP FINDINGS/, 'smart report must render findings');
assert.match(advisorySurface, /TOP RISKS/, 'smart report must render risks');
assert.match(advisorySurface, /TOP OPPORTUNITIES/, 'smart report must render opportunities');
const intelligencePanelMatrixPath = fileURLToPath(new URL('../src/components/ReportIntelligencePanel.tsx', import.meta.url));
const intelligencePanelMatrix = fs.readFileSync(intelligencePanelMatrixPath, 'utf8');
assert.match(intelligencePanelMatrix, /طبقات الذكاء/, 'smart report must expose the intelligence layer matrix');
assert.match(intelligencePanelMatrix, /تحليلي/, 'smart report intelligence matrix must show analytical layer');
assert.match(intelligencePanelMatrix, /تفسيري/, 'smart report intelligence matrix must show explanatory layer');
assert.match(intelligencePanelMatrix, /تحذيري/, 'smart report intelligence matrix must show warning layer');
assert.match(intelligencePanelMatrix, /تنبؤي/, 'smart report intelligence matrix must show predictive layer');
assert.match(intelligencePanelMatrix, /إرشادي/, 'smart report intelligence matrix must show guidance layer');
assert.match(intelligencePanelMatrix, /توصية/, 'smart report intelligence matrix must show recommendation layer');

const intelligencePagePath = fileURLToPath(new URL('../src/pages/IntelligencePage.tsx', import.meta.url));
const intelligencePage = fs.readFileSync(intelligencePagePath, 'utf8');
assert.equal((intelligencePage.match(/<SourceIntelligenceRail report=\{sourceReport\} \/>/g) ?? []).length, 3, 'intelligence, recommendations, and forecast screens must each render one source-bound rail');
assert.match(intelligencePage, /SourceRecommendationsDetail/, 'recommendation screen must expose report-bound recommendation details');
assert.match(intelligencePage, /SourceSignalsDetail/, 'intelligence screen must expose all source-bound signals');
assert.match(intelligencePage, /SourceGuidanceDetail/, 'intelligence screen must expose source-bound guidance details');
assert.match(intelligencePage, /SourceForecastDetail/, 'forecast screen must expose report-bound forecast details');
assert.match(intelligencePage, /loadOptionalSourceReport/, 'intelligence screens must load the active Report Job context');
assert.match(intelligencePage, /intelligence\.recommendations\.length/, 'recommendation screen must expose report-bound recommendations');
assert.match(intelligencePage, /intelligence\.forecast\.status/, 'forecast screen must expose report-bound forecast state');
assert.match(intelligencePage, /Promise\.allSettled\(\[/, 'intelligence center must tolerate partial generic intelligence API failures');
assert.match(intelligencePage, /error && sourceReport \? <section/, 'source-bound intelligence must remain visible when a generic intelligence feed fails');
assert.match(intelligencePage, /loading && !sourceReport/, 'source-bound intelligence must not remain hidden behind generic feed loading');


const reportSourceContextPath = fileURLToPath(new URL('../src/components/ReportSourceContext.tsx', import.meta.url));
const reportSourceContext = fs.readFileSync(reportSourceContextPath, 'utf8');
assert.match(reportSourceContext, /reportJobId/, 'report-aware shell must preserve the active report job context');
assert.match(reportSourceContext, /sourceHash/, 'report-aware shell must preserve the active source hash context');
assert.match(reportSourceContext, /\/reports\/smart\//, 'report-aware shell must link back to the smart report');
assert.match(reportSourceContext, /\/trust\?reportJobId=/, 'report-aware shell must preserve the source-bound evidence route');
assert.match(reportSourceContext, /\/decision-experience\?stage=evidence&reportJobId=/, 'report-aware shell must preserve the source-bound decision route');

const appPath = fileURLToPath(new URL('../src/App.tsx', import.meta.url));
const app = fs.readFileSync(appPath, 'utf8');
assert.match(app, /<ReportSourceContext\/>/, 'global shell must keep active report intelligence visible while navigating across screens');

const smartReportPath = fileURLToPath(new URL('../src/lib/report-smart.ts', import.meta.url));
const smartReport = fs.readFileSync(smartReportPath, 'utf8');

assert.match(
  smartReport,
  /from\('report_evidence_passports'\)/,
  'Smart Report must consult the current Evidence Passport instead of trusting stale rendered provenance',
);
assert.match(
  smartReport,
  /const effectiveRendered: Record<string, unknown> = currentPassport/,
  'Smart Report must derive its effective provenance from the current Passport',
);
assert.match(
  smartReport,
  /renderedOutput: runtimeRendered/,
  'Smart Report consumers must receive the Passport-refreshed provenance',
);
assert.match(
  smartReport,
  /const runtimeSignalStatus = intelligence\.signals\.length/,
  'Smart Report signal status must be derived from current intelligence',
);
assert.match(
  smartReport,
  /const runtimeIntelligenceStatus/,
  'Smart Report intelligence status must be derived from current archetype/evidence runtime state',
);
assert.match(
  smartReport,
  /signalStatus: runtimeSignalStatus/,
  'Smart Report must expose current signal status in rendered output',
);
assert.match(
  smartReport,
  /intelligenceStatus: runtimeIntelligenceStatus/,
  'Smart Report must expose current intelligence status in rendered output',
);
const runtimeStateDeclaration = smartReport.indexOf('const runtimeRendered = {');
const runtimeStateUse = smartReport.indexOf('renderedOutput: runtimeRendered,');
assert.ok(runtimeStateDeclaration >= 0, 'Smart Report runtime rendered state declaration must exist');
assert.ok(runtimeStateUse > runtimeStateDeclaration, 'Smart Report must only consume runtimeRendered after it is initialized');
assert.match(smartReport, /renderedOutput: effectiveRendered,/, 'base intelligence must consume the passport-refreshed rendered state before runtime state is synthesized');
assert.match(
  smartReport,
  /function resolveEffectiveSpecialty\(renderedSpecialty: unknown, analysis: AnalysisSnapshotLike/,
  'Smart Report specialty resolution must have a source-derived fallback',
);
assert.match(
  smartReport,
  /const inferred = inferSpecialtyFromAnalysis\(analysis\)/,
  'Smart Report must infer specialty from source analysis when it is available',
);
assert.match(
  smartReport,
  /const specialty = resolveEffectiveSpecialty\(/,
  'Smart Report runtime must use resolved specialty rather than stale rendered metadata',
);
assert.match(
  smartReport,
  /headline: 'النموذج لم يجتز بوابة التشغيل: ' \+ archetypeRun\.state \+ ' — تم إبقاء الذكاء المصدرّي المتاح/,
  'Archetype review must preserve source intelligence instead of blanking all signals and recommendations',
);
assert.doesNotMatch(
  smartReport,
  /archetypeRun\.state === 'SUPPORTED'[\s\S]*?recommendations: \[\]/,
  'Archetype review must not erase all source recommendations',
);
assert.match(
  smartReport,
  /const runtimeWarnings: string\[\] = \[\]/,
  'Smart Report must have a fail-soft runtime warning channel',
);
assert.match(
  smartReport,
  /canonicalFetchError = true/,
  'Canonical row read failures must downgrade to partial analysis instead of crashing the report',
);
assert.match(
  smartReport,
  /const canonicalCommitQueryFailed = Boolean\(canonicalCommitError\)/,
  'Canonical commit read failures must be tracked separately from data gaps',
);
assert.match(
  smartReport,
  /canonicalCommitQueryFailed \|\| authoritativeCurrentRowCount == null/,
  'A failed commit read must not be reported as a canonical gap',
);
assert.match(
  smartReport,
  /canonicalCommitQueryFailed \|\| !canonicalRowsComplete \|\| canonicalRowsPartial/,
  'A failed commit read must downgrade verification to PARTIAL_ANALYSIS',
);
assert.match(
  smartReport,
  /PARTIAL_FETCH_ERROR/,
  'Smart Report must expose a distinct partial-fetch-error scope',
);


assert.match(
  smartReport,
  /evidenceSnapshotId: currentPassport\.evidence_snapshot_id/,
  'Smart Report must bind decision provenance to the Passport snapshot',
);

const catalogMatch = smartReport.match(/function mapCatalogItem\([\s\S]*?\r?\n}\r?\n\r?\nexport async function fetchSmartReportCatalog/);
assert.ok(catalogMatch, 'Smart Report catalog mapper must remain discoverable for regression checks');
assert.doesNotMatch(
  catalogMatch[0],
  /effectiveRendered/,
  'catalog mapping must use its local rendered output; Passport-refreshed effectiveRendered exists only inside fetchSmartReport',
);
assert.match(catalogMatch[0], /const rendered = renderedOutputOf\(job\.evidence\) \?\? \{\};/, 'catalog must render completed report sources even when prior renderedOutput is absent');

assert.match(smartReport, /runtimeWarnings\.push\('تعذر قراءة لقطات التحليل البديلة؛ استمر التقرير اعتمادًا على المخرجات المحفوظة والصفوف الكانونية المتاحة.'\)/, 'latest analysis snapshot failure must degrade to a visible runtime warning instead of throwing');
assert.match(smartReport, /function emptyReportIntelligence\(specialty: string \| null\)/, 'Smart Report must have a safe fallback intelligence object');
assert.match(smartReport, /function analysisUsabilityScore\(analysis: Record<string, unknown>\)/, 'analysis selection must score snapshots by usable schema instead of timestamp alone');
assert.match(smartReport, /function chooseBestAnalysisSnapshot\(rows: Array<Record<string, unknown>>\)/, 'analysis selection must choose the most usable snapshot deterministically');
assert.match(smartReport, /analysis = chooseBestAnalysisSnapshot\(\(analyses \?\? \[\]\) as Array<Record<string, unknown>>\)/, 'detail fallback must use the best usable analysis snapshot');
assert.match(smartReport, /deriveReportIntelligence\([\s\S]*?catch \(error\)/, 'intelligence derivation must be guarded against malformed runtime data');
assert.match(smartReport, /runReportArchetype\([\s\S]*?catch \(error\)/, 'specialized archetype execution must fail soft');
assert.match(smartReport, /function resolveImportJobId\([\s\S]*evidenceKeys[\s\S]*startsWith\('import:'\)/, 'Smart Report must prefer execution checkpoint import lineage over an unrelated analysis snapshot import id');
assert.match(smartReport, /const exactCanonicalCommit = authoritativeCurrentRowCount == null/, 'canonical commit selection must avoid double counting repeated imports when an exact authoritative count exists');

assert.match(smartReport, /(?:const|let) canonicalImportJobId = renderedImportId \|\|/, 'canonical rows must prefer the active import job identity');
assert.match(smartReport, /canonicalSourceQuery\.eq\('import_job_id', canonicalImportJobId\)/, 'canonical row reads must scope to the active import job');


console.log('PASS: evidence verification, Advisor decision provenance, live Passport readback, catalog provenance scope and source-proposal reconciliation remain fail-closed.');
