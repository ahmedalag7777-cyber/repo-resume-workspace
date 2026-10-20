import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'supabase', 'migrations');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')) : [];
const migrationText = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const queriesSource = fs.readFileSync(path.join(root, 'src/lib/queries.ts'), 'utf8');
const compatSource = fs.readFileSync(path.join(root, 'src/lib/queries-compat.ts'), 'utf8');

const required = ['import_finish_job', 'current_company_id', 'IMPORT_TERMINAL_STATUS_REQUIRED'];
const missing = required.filter((token) => !migrationText.includes(token));
if (missing.length) {
  console.error('Import lifecycle contract missing: ' + missing.join(', '));
  process.exit(1);
}

const terminalResurrectionFix = fs.readFileSync(path.join(dir, '20260903202500_harden_import_progress_terminal_resurrection.sql'), 'utf8');
const terminalGuardPattern = /if\s+v_current_status\s+in\s*\('completed','partial','failed','cancelled'\)\s+then\s+raise\s+exception\s+'IMPORT_JOB_ALREADY_TERMINAL';\s+end\s+if;/i;
if (!terminalResurrectionFix.includes('v_current_status') || !terminalResurrectionFix.toLowerCase().includes('import_job_already_terminal') || !terminalResurrectionFix.toLowerCase().includes("status in ('queued','processing')") || !terminalResurrectionFix.toLowerCase().includes('for update')) {
  throw new Error('Import terminal resurrection hardening missing required state/lock guards');
}
if (!terminalGuardPattern.test(terminalResurrectionFix)) throw new Error('Import terminal resurrection hardening: terminal guard shape missing');

const appInvariants = [
  'async function readImportJob',
  'current.total_rows * progress / 100',
  'p_valid_rows: current.valid_rows',
  'p_invalid_rows: current.invalid_rows',
  'p_duplicate_rows: current.duplicate_rows',
  "const TERMINAL_IMPORT_STATUSES = new Set(['completed', 'partial', 'failed', 'cancelled'])",
  'IMPORT_STATE_INSUFFICIENT_DATA',
  'data.total_rows == null ? null : Number(data.total_rows)',
  'row.total_rows == null ? null : Number(row.total_rows)',
  'row.quarantined_rows == null ? null : Number(row.quarantined_rows)',
];
const assertAppContract = (source) => {
  const missing = appInvariants.filter((token) => !source.includes(token));
  if (missing.length) throw new Error('Import application truth contract missing: ' + missing.join(', '));
};
assertAppContract(queriesSource);
const compatImportForwardingPattern = /export async function fetchImportRecords\(limit = 500, focusJobId\?: string\): Promise<ImportRecord\[\]> \{ return canonicalFetchImportRecords\(limit, focusJobId\); \}/;
if (!compatImportForwardingPattern.test(compatSource)) {
  throw new Error('Compatibility import boundary must forward fetchImportRecords to canonical queries.ts');
}

const knownBadPatterns = [
  'p_processed_rows: Math.max(0, Math.round(patch.progress))',
  'p_valid_rows: Math.max(0, Math.round(patch.progress))',
  'total_rows: Number(data.total_rows ?? 0)',
  'total_rows: row.total_rows ?? 0',
  'valid_rows: row.valid_rows ?? 0',
  'invalid_rows: row.invalid_rows ?? 0',
  'quarantined_rows: 0',
];
const regressions = knownBadPatterns.filter((token) => queriesSource.includes(token) || compatSource.includes(token));
if (regressions.length) {
  console.error('Import truth regression detected: ' + regressions.join(', '));
  process.exit(1);
}

const tampered = queriesSource.replace('current.total_rows * progress / 100', 'progress');
let tamperRejected = false;
try { assertAppContract(tampered); } catch { tamperRejected = true; }
if (!tamperRejected) throw new Error('Import state test-of-test failed: weakened progress conversion was not detected');

const weakenedNullGuard = queriesSource.replaceAll('IMPORT_STATE_INSUFFICIENT_DATA', '');
let nullGuardRejected = false;
try { assertAppContract(weakenedNullGuard); } catch { nullGuardRejected = true; }
if (!nullGuardRejected) throw new Error('Import NULL-state test-of-test failed: weakened unknown-state handling was not detected');

const weakenedTerminalGuard = terminalResurrectionFix.replace(terminalGuardPattern, '');
if (terminalGuardPattern.test(weakenedTerminalGuard)) throw new Error('Import terminal-state test-of-test failed: weakened terminal guard was not actually removed');
let terminalTamperRejected = false;
try {
  if (!terminalGuardPattern.test(weakenedTerminalGuard)) throw new Error('terminal guard missing');
} catch { terminalTamperRejected = true; }
if (!terminalTamperRejected) throw new Error('Import terminal-state test-of-test failed: weakened terminal guard was not detected');

console.log('Import lifecycle contract PASS (DB lifecycle + percentage-to-row truth + NULL preservation + terminal-resurrection guard + regression guard)');