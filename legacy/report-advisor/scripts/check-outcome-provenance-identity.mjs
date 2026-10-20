import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260830235000_harden_outcome_provenance_identity.sql';
const snapshotMigrationPath = 'supabase/migrations/20260831012000_harden_outcome_evidence_snapshot_identity.sql';
if (!fs.existsSync(migrationPath) || !fs.existsSync(snapshotMigrationPath)) throw new Error('Missing outcome provenance identity migration');
const sql = fs.readFileSync(migrationPath, 'utf8');
const snapshotSql = fs.readFileSync(snapshotMigrationPath, 'utf8');

const stripSqlComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\n)\s*--[^\n]*/g, '$1');

const required = [
  'OUTCOME_PROVENANCE_NOT_FOUND',
  'r.id::text = p_recommendation_key',
  'd.decision_key = p_decision_fingerprint',
  'r.decision_fingerprint = p_decision_fingerprint',
  'REVOKE ALL ON FUNCTION public.record_recommendation_outcome',
  'REVOKE ALL ON FUNCTION public.record_decision_outcome',
];
const snapshotRequired = [
  'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN',
  'kpi_evidence_snapshots',
  'business_state_snapshots',
  'import_snapshots',
  'operational_health_snapshots',
  'decision_action_receipts',
];

const assertContract = (source, markers) => {
  const executable = stripSqlComments(source);
  for (const marker of markers) {
    if (!executable.includes(marker)) throw new Error('Missing outcome provenance guard: ' + marker);
  }
};

assertContract(sql, required);
assertContract(snapshotSql, snapshotRequired);

const guard = 'OUTCOME_PROVENANCE_NOT_FOUND';
const tampered = sql.replaceAll(guard, 'OUTCOME_PROVENANCE_REMOVED');
let tamperedRejected = false;
try { assertContract(tampered, required); } catch { tamperedRejected = true; }
if (!tamperedRejected) throw new Error('Test-of-test failed: tampered identity guard still satisfied the contract');

const snapshotTampered = snapshotSql
  .replaceAll('OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN', '')
  .replaceAll('kpi_evidence_snapshots', '')
  .replaceAll('business_state_snapshots', '')
  .replaceAll('import_snapshots', '')
  .replaceAll('operational_health_snapshots', '')
  .replaceAll('decision_action_receipts', '');
let snapshotRejected = false;
try { assertContract(snapshotTampered, snapshotRequired); } catch { snapshotRejected = true; }
if (!snapshotRejected) throw new Error('Test-of-test failed: evidence snapshot identity guard can be removed without detection');

const commentDecoy = `/* ${guard} */\n-- OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN`;
let decoyRejected = false;
try { assertContract(commentDecoy, [...required, ...snapshotRequired]); } catch { decoyRejected = true; }
if (!decoyRejected) throw new Error('Test-of-test accepted comment-only provenance markers');

console.log('Outcome provenance identity regression: PASS (tenant identity, evidence snapshot identity, executable contract, and adversarial test-of-test)');
