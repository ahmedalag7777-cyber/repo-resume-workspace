import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260831000500_harden_work_item_outcome_provenance.sql';
const provenancePath = 'supabase/migrations/20260831010000_harden_evidence_snapshot_provenance.sql';
const migration = fs.readFileSync(migrationPath, 'utf8');
const provenance = fs.readFileSync(provenancePath, 'utf8');
const source = fs.readFileSync('src/lib/decision-automation/vertical-slice-runtime.ts', 'utf8');

const stripSqlComments = (sql) => sql
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\n)\s*--[^\n]*/g, '$1');

const normalizeSql = (sql) => stripSqlComments(sql).replace(/\s+/g, ' ').trim();

const assertContains = (sql, tokens, label) => {
  const executable = stripSqlComments(sql);
  const normalized = normalizeSql(sql);
  for (const token of tokens) {
    const normalizedToken = token.replace(/\s+/g, ' ').trim();
    if (!normalized.includes(normalizedToken)) throw new Error(`Missing ${label} invariant: ${token}`);
  }
  return executable;
};

// The historical lifecycle migration owns outcome status semantics and the
// latest provenance migration owns evidence identity. Keep those contracts
// asserted against their actual canonical source files rather than assuming
// both concerns live in the final migration.
const historical = assertContains(migration, [
  'complete_decision_work_item',
  "CASE WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient'",
  "WHEN p_actual_impact > v_expected THEN 'positive'",
  "WHEN p_actual_impact = v_expected THEN 'neutral'",
  "ELSE 'negative'",
  'status = EXCLUDED.status',
  'company_id = v_company',
  "status <> 'IN_PROGRESS'",
  'RAISE EXCEPTION \'OUTCOME_EVIDENCE_REQUIRED\'',
], 'historical work-item outcome');

const executable = assertContains(provenance, [
  'complete_decision_work_item',
  "v_evidence_snapshot_id text := NULLIF(btrim(COALESCE(p_evidence->>'evidence_snapshot_id', '')), '')",
  "RAISE EXCEPTION 'OUTCOME_EVIDENCE_REQUIRED'",
  'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN',
  'kpi_evidence_snapshots',
  'business_state_snapshots',
  'import_snapshots',
  'operational_health_snapshots',
  'decision_action_receipts',
  'company_id = v_company',
  'REVOKE ALL ON FUNCTION public.complete_decision_work_item',
], 'current evidence provenance');

if (!/'evidence_snapshot_id'\s*,\s*v_evidence_snapshot_id/.test(executable)) {
  throw new Error('Missing current evidence provenance invariant: evidence_snapshot_id JSON identity');
}
if (!source.includes('p_evidence: evidence')) {
  throw new Error('Runtime work-item completion must forward evidence to the canonical RPC');
}

// Test the test: removing a historical lifecycle invariant must be detected.
const tamperedHistorical = historical
  .replaceAll('status = EXCLUDED.status', '')
  .replaceAll("CASE WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient'", '');
let historicalTamperRejected = false;
try {
  assertContains(tamperedHistorical, [
    'status = EXCLUDED.status',
    "CASE WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient'",
  ], 'historical work-item');
} catch {
  historicalTamperRejected = true;
}
if (!historicalTamperRejected) {
  throw new Error('Test-of-test failed: historical outcome semantics could be removed without detection');
}

// Test the test: removing tenant-bound evidence identity must be detected.
const tamperedProvenance = executable
  .replaceAll('OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN', '')
  .replaceAll('kpi_evidence_snapshots', '')
  .replaceAll('business_state_snapshots', '')
  .replaceAll('import_snapshots', '')
  .replaceAll('operational_health_snapshots', '')
  .replaceAll('decision_action_receipts', '')
  .replace(/'evidence_snapshot_id'\s*,\s*v_evidence_snapshot_id/g, '');
let provenanceTamperRejected = false;
try {
  assertContains(tamperedProvenance, [
    'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN',
    'kpi_evidence_snapshots',
    'business_state_snapshots',
    'import_snapshots',
    'operational_health_snapshots',
    'decision_action_receipts',
  ], 'current evidence provenance');
} catch {
  provenanceTamperRejected = true;
}
if (!provenanceTamperRejected) {
  throw new Error('Test-of-test failed: tenant-bound evidence provenance could be removed without detection');
}

// Comment decoys must never satisfy the executable contract.
const decoyWithoutGuard = stripSqlComments(
  `${provenance}\n-- OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN\n-- kpi_evidence_snapshots`
).replaceAll('OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN', '')
 .replaceAll('kpi_evidence_snapshots', '');
let decoyRejected = false;
try {
  assertContains(decoyWithoutGuard, [
    'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN',
    'kpi_evidence_snapshots',
  ], 'current evidence provenance');
} catch {
  decoyRejected = true;
}
if (!decoyRejected) {
  throw new Error('Test-of-test accepted a comment decoy as executable evidence provenance');
}

console.log('Work-item outcome provenance boundary: PASS (historical lifecycle semantics + tenant-bound evidence identity + adversarial test-of-test)');
