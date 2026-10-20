import fs from 'node:fs';

const fail = (message) => { throw new Error(message); };
const source = fs.readFileSync(new URL('./real-48-source-matrix-preflight.mjs', import.meta.url), 'utf8');
const canonicalSchema = fs.readFileSync(new URL('../src/lib/report-intelligence/canonical-schema.ts', import.meta.url), 'utf8');
const browserWorkflow = fs.readFileSync(new URL('../.github/workflows/full-product-browser-e2e.yml', import.meta.url), 'utf8');
const genericFileTest = fs.readFileSync(new URL('./generic-file-analysis.test.mjs', import.meta.url), 'utf8');

for (const marker of [
  "verification_status: 'VERIFIED'",
  "decision_readiness: 'READY'",
  "report_evidence_snapshots",
  "analysis_snapshot_id",
  "runReportArchetype",
  "claim.archetypeId === profile.id",
  "claim.evidenceSnapshotId === candidate.snapshot.id",
  "persistedArchetypeConsistency",
  "persistedArchetypeId",
  "status: supported === profiles.length ? 'PASS' : 'NOT_PROVEN'",
  "canonicalRowsRead: chosen ? sourceRowsCache.get(String(chosen.job.id))?.length ?? 0 : 0,",
]) {
  if (!source.includes(marker)) fail('Missing real-48 proof invariant: ' + marker);
}
for (const marker of ['customer_id','supplier_id','invoice_number','net_sales','sales_amount','purchase_amount','net_local_amount','payment_amount','inbound_quantity','outbound_quantity']) {
  if (!canonicalSchema.includes(marker)) fail('Missing real-source canonical alias: ' + marker);
}
if (source.includes("create_source_intelligence_proposal")) fail('Preflight must remain read-only');
if (source.includes("request_decision_approval")) fail('Preflight must not create approvals');
if (source.includes("create_decision_work_item")) fail('Preflight must not create work items');


if (browserWorkflow.includes('continue-on-error: true')) {
  fail('Optional specialist coverage must be made non-blocking by its explicit diagnostic wrapper, not continue-on-error');
}
if (!browserWorkflow.includes('OPTIONAL_SPECIALIST_MATRIX_EXECUTION_ERROR')) {
  fail('Optional specialist execution errors must be surfaced explicitly in the diagnostic log');
}
for (const marker of [
  "REAL_SOURCE_MATRIX_DIAGNOSTIC_ONLY === '1'",
  "OPTIONAL_SPECIALIST_COVERAGE_NOT_PROVEN",
]) {
  if (!source.includes(marker)) fail('Specialist coverage must remain explicitly optional when diagnostic-only: ' + marker);
}
const genericStepIndex = browserWorkflow.indexOf('Validate generic file intelligence across supported formats');
const specialistStepIndex = browserWorkflow.indexOf('Diagnose optional real-source coverage for 48 specialist archetypes');
if (genericStepIndex < 0 || specialistStepIndex < 0 || genericStepIndex > specialistStepIndex) {
  fail('Universal generic format proof must run before optional specialist coverage diagnostics');
}
if (!browserWorkflow.includes('timeout --signal=TERM --kill-after=15s 240s node --experimental-loader ./scripts/node-ts-extension-loader.mjs scripts/real-48-source-matrix-preflight.mjs')) {
  fail('Optional specialist diagnostics need a bounded runtime so they cannot delay universal file proof indefinitely');
}
for (const marker of [
  "Diagnose optional real-source coverage for 48 specialist archetypes",
  "REAL_SOURCE_MATRIX_DIAGNOSTIC_ONLY: '1'",
  "Validate generic file intelligence across supported formats",
  "Fail closed on universal browser evidence",
  "UNIVERSAL_BROWSER_PROOF_GATE=PASS",
  "OPTIONAL_SPECIALIST_COVERAGE=",
  "NOT_A_GENERIC_ANALYSIS_GATE=true",
]) {
  if (!browserWorkflow.includes(marker)) fail('Universal generic-analysis acceptance must not depend on 48 real-source archetypes: ' + marker);
}
if (browserWorkflow.includes("'artifacts/e2e-business/real-48-source-matrix-preflight.json',\n          ];")) {
  fail('The specialist source matrix must not be included in the universal browser blocking result set');
}
for (const marker of [
  "unclassified-operational-data.csv",
  "a generic source without a valid specialist fingerprint must remain unclassified",
  "generic source structural analysis must remain visible without a specialist",
  "generic source findings must remain available without a specialist",
]) {
  if (!genericFileTest.includes(marker)) fail('Generic file proof missing optional-specialty regression: ' + marker);
}

console.log('real-48-source-matrix-contract: PASS');
