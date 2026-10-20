import fs from 'node:fs';

const path = 'src/lib/decision-automation/vertical-slice-runtime.ts';
const source = fs.readFileSync(path, 'utf8');
const recommendationMigration = 'supabase/migrations/20260830170001_harden_runtime_recommendation_evidence_boundary.sql';
const provenanceMigration = 'supabase/migrations/20260831010000_harden_evidence_snapshot_provenance.sql';
const recommendationSql = fs.readFileSync(recommendationMigration, 'utf8');
const provenanceSql = fs.readFileSync(provenanceMigration, 'utf8');

const forbidden = [
  /from\(['"]recommendations['"]\)\s*\.insert\s*\(/,
  /from\(['"]business_intelligence_decisions['"]\)\s*\.insert\s*\(/,
  /from\(['"]alerts['"]\)\s*\.insert\s*\(/,
];

const failures = forbidden.filter((pattern) => pattern.test(source));
if (failures.length) {
  console.error('Decision runtime DML boundary regression: FAIL');
  console.error('Lifecycle-sensitive decision/recommendation/alert inserts must use canonical RPCs.');
  process.exit(1);
}

for (const required of [
  "rpc('create_runtime_recommendation'",
  "rpc('create_runtime_decision'",
  "rpc('notify_decision_work_item'",
]) {
  if (!source.includes(required)) {
    console.error(`Decision runtime DML boundary regression: missing ${required}`);
    process.exit(1);
  }
}

for (const required of [
  'p_evidence_snapshot_id uuid',
  'RECOMMENDATION_EVIDENCE_REQUIRED',
  'RECOMMENDATION_EVIDENCE_NOT_FOUND_OR_FORBIDDEN',
  'kpi_evidence_snapshots',
  'business_state_snapshots',
  'import_snapshots',
  'operational_health_snapshots',
  'REVOKE ALL ON FUNCTION public.create_runtime_recommendation',
  'GRANT EXECUTE ON FUNCTION public.create_runtime_recommendation',
]) {
  if (!provenanceSql.includes(required)) {
    console.error(`Decision runtime recommendation evidence boundary regression: missing ${required}`);
    process.exit(1);
  }
}

// The legacy boundary must still exist in the replay chain; the later
// provenance migration is the canonical final reassertion.
if (!recommendationSql.includes('RECOMMENDATION_EVIDENCE_REQUIRED')) {
  throw new Error('Legacy recommendation evidence gate disappeared from replay history');
}

const stripSqlComments = (sql) => sql
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\n)\s*--[^\n]*/g, '$1');
const tampered = stripSqlComments(provenanceSql)
  .replaceAll('RECOMMENDATION_EVIDENCE_NOT_FOUND_OR_FORBIDDEN', '')
  .replaceAll('kpi_evidence_snapshots', '') + '\n-- RECOMMENDATION_EVIDENCE_NOT_FOUND_OR_FORBIDDEN\n-- kpi_evidence_snapshots';
if (stripSqlComments(tampered).includes('RECOMMENDATION_EVIDENCE_NOT_FOUND_OR_FORBIDDEN')) {
  throw new Error('Decision runtime recommendation provenance test-of-test accepted comment-only evidence provenance');
}

console.log('Decision runtime DML boundary regression: PASS');
