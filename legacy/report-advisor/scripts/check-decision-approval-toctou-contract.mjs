import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
const sql = migrations.join('\n');

function latestFunctionBody(source, name) {
  const re = new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${name}\\s*\\(`, 'gi');
  let match;
  let lastMatch = null;
  let start = -1;
  while ((match = re.exec(source))) {
    lastMatch = match;
    start = match.index;
  }
  if (start < 0 || !lastMatch) throw new Error(`Missing canonical function: ${name}`);
  const nextRe = /\nCREATE\s+OR\s+REPLACE\s+FUNCTION/gi;
  nextRe.lastIndex = start + 1;
  const nextMatch = nextRe.exec(source);
  const end = nextMatch ? nextMatch.index : source.length;
  return source.slice(start, end);
}

export function validateDecisionApprovalToctou(source) {
  const body = latestFunctionBody(source, 'request_decision_approval');
  const decisionSelect = body.indexOf('from public.business_intelligence_decisions');
  const decisionGate = body.indexOf("v_decision_status is distinct from 'PROPOSED'");
  // Bind the lock specifically to the authoritative decision SELECT. Searching
  // for any later FOR UPDATE would let the approval-row lock mask a missing
  // decision lock in the adversarial fixture.
  const decisionQuery = body.slice(decisionSelect);
  const decisionLockMatch = decisionQuery.match(/and d\.company_id = v_company\s+for update/i);
  const decisionLock = decisionLockMatch ? decisionSelect + decisionQuery.indexOf(decisionLockMatch[0]) : -1;
  const approvalSelect = body.indexOf('from public.decision_approvals');
  const terminalGuard = body.indexOf("v_existing_status in ('APPROVED','REJECTED','CANCELLED')");
  if (decisionSelect < 0 || decisionLock < decisionSelect) throw new Error('Decision row is not locked before approvability check');
  if (decisionGate < decisionLock) throw new Error('Approvaibility check is not performed after decision lock');
  if (approvalSelect < decisionLock) throw new Error('Approval row lookup precedes decision lock');
  if (terminalGuard < approvalSelect) throw new Error('Terminal approval guard missing or reordered');
  if (!body.includes('where public.decision_approvals.status not in')) throw new Error('Conflict-path terminal guard missing');
  return true;
}

validateDecisionApprovalToctou(sql);

// Test-of-test: adversarial mutations must target the latest canonical function body.
function replaceLatestFunctionBody(source, name, mutate) {
  const re = new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${name}\\s*\\(`, 'gi');
  let match;
  let start = -1;
  while ((match = re.exec(source))) start = match.index;
  if (start < 0) throw new Error(`Missing canonical function: ${name}`);
  const openParen = source.indexOf('(', start);
  if (openParen < 0) throw new Error(`Missing canonical function signature: ${name}`);
  const nextRe = /\nCREATE\s+OR\s+REPLACE\s+FUNCTION/gi;
  nextRe.lastIndex = openParen + 1;
  const nextMatch = nextRe.exec(source);
  const end = nextMatch ? nextMatch.index : source.length;
  const body = source.slice(start, end);
  assert.notEqual(body.length, 0, `Missing canonical function body: ${name}`);
  const mutated = mutate(body);
  assert.notEqual(mutated, body, `Adversarial mutation did not change canonical function: ${name}`);
  return source.slice(0, start) + mutated + source.slice(end);
}
const canonicalBody = latestFunctionBody(sql, 'request_decision_approval');
const canonicalDecisionSelect = canonicalBody.indexOf('from public.business_intelligence_decisions');
const canonicalDecisionLockMatch = canonicalBody
  .slice(canonicalDecisionSelect)
  .match(/and d\.company_id = v_company\s+for update/i);
if (!canonicalDecisionLockMatch) throw new Error('Missing canonical decision lock fixture target');
const noDecisionLock = replaceLatestFunctionBody(sql, 'request_decision_approval', body => {
  const lockMatch = body.match(/and d\.company_id = v_company\s+for update/i);
  if (!lockMatch) throw new Error('Adversarial decision-lock mutation target missing in local body');
  const weakened = body.slice(0, lockMatch.index) + lockMatch[0].replace(/\s+for update$/i, '') + body.slice(lockMatch.index + lockMatch[0].length);
  if (weakened === body) throw new Error('Adversarial decision-lock mutation did not apply');
  return weakened;
});
assert.throws(() => validateDecisionApprovalToctou(noDecisionLock), /Decision row is not locked/);
const gateBeforeLock = replaceLatestFunctionBody(sql, 'request_decision_approval', body => {
  const lockMatch = body.match(/and d\.company_id = v_company\s+for update/i);
  const gateIndex = body.indexOf("v_decision_status is distinct from 'PROPOSED'");
  if (!lockMatch || gateIndex < 0) throw new Error('Missing canonical gate/lock fixture targets');
  const decisionLockStart = lockMatch.index + lockMatch[0].length - 'for update'.length;
  const withoutLock = body.slice(0, decisionLockStart) + body.slice(decisionLockStart + 'for update'.length);
  const gateInWeak = withoutLock.indexOf("v_decision_status is distinct from 'PROPOSED'");
  return withoutLock.slice(0, gateInWeak) + 'for update\n    ' + withoutLock.slice(gateInWeak);
});
assert.throws(() => validateDecisionApprovalToctou(gateBeforeLock), /Decision row is not locked before approvability check/);
console.log('Decision approval TOCTOU contract: PASS (decision lock-before-check + terminal guard + adversarial weakened-lock/gate test-of-test)');