import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260904004001_harden_terminal_approval_concurrency.sql', 'utf8');
const terminalGuard = "where public.decision_approvals.status not in ('APPROVED','REJECTED','CANCELLED')";
const required = [
  'on conflict(company_id,decision_id) do update',
  terminalGuard,
  "raise exception 'APPROVAL_TERMINAL_NOT_REOPENABLE'",
];
for (const token of required) assert.ok(migration.includes(token), `missing concurrency invariant: ${token}`);

function validateConcurrencyBoundary(sql) {
  assert.ok(sql.includes('on conflict(company_id,decision_id) do update'), 'upsert conflict path missing');
  assert.ok(sql.includes(terminalGuard), 'terminal conflict guard missing');
  assert.ok(sql.includes("if v_id is null"), 'conflict/no-update path must be fail-closed');
  assert.ok(sql.includes("raise exception 'APPROVAL_TERMINAL_NOT_REOPENABLE'"), 'terminal resurrection must fail closed');
}

validateConcurrencyBoundary(migration);
const weakened = migration.replace(`\n    ${terminalGuard}`, '');
assert.throws(() => validateConcurrencyBoundary(weakened), /terminal conflict guard missing/);

console.log('Terminal approval concurrency boundary: PASS (conflict-path terminal guard + fail-closed no-update + test-of-test)');
