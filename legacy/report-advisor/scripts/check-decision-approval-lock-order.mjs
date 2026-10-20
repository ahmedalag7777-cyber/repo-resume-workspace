import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(process.cwd(), 'supabase', 'migrations');
const sql = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');

function latestBody(name) {
  const re = new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${name}\\s*\\(`, 'gi');
  let m, start = -1;
  while ((m = re.exec(sql))) start = m.index;
  if (start < 0) throw new Error(`missing ${name}`);
  const next = sql.indexOf('\nCREATE OR REPLACE FUNCTION', start + 1);
  return sql.slice(start, next < 0 ? sql.length : next);
}
const pos = (body, needle, from = 0) => body.indexOf(needle, from);
const lockCount = (body) => (body.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').match(/\bfor\s+update\b/gi) ?? []).length;

const request = latestBody('request_decision_approval');
const decide = latestBody('decide_approval');

const reqDecision = pos(request, 'from public.business_intelligence_decisions');
const reqDecisionLock = pos(request, 'for update', reqDecision);
const reqGate = pos(request, "v_decision_status is distinct from 'PROPOSED'");
const reqApproval = pos(request, 'from public.decision_approvals');
if (!(reqDecision >= 0 && reqDecisionLock > reqDecision && reqGate > reqDecisionLock && reqApproval > reqDecisionLock)) throw new Error('request_decision_approval does not lock decision before approval lookup/check');

const decResolve = pos(decide, 'from public.decision_approvals');
const decDecision = pos(decide, 'from public.business_intelligence_decisions');
const decDecisionLock = pos(decide, 'for update', decDecision);
const decGate = pos(decide, "v_decision_status is distinct from 'PROPOSED'");
const decApproval = pos(decide, 'from public.decision_approvals', decResolve + 1);
if (!(decResolve >= 0 && decDecision > decResolve && decDecisionLock > decDecision && decGate > decDecisionLock && decApproval > decDecisionLock)) throw new Error('decide_approval does not follow decision -> approval lock order');

// Test-of-test: each required SQL lock is anchored to its semantic query, not
// counted globally (comments/documentation may legitimately contain the phrase).
const reqApprovalLock = pos(request, 'for update', reqApproval + 1);
assert.ok(reqDecisionLock >= 0 && reqApprovalLock > reqDecisionLock);
assert.equal(pos(decide, 'for update', decDecision), decDecisionLock);

const weakenedRequestDecision = request.slice(0, reqDecisionLock) + request.slice(reqDecisionLock + 'for update'.length);
assert.throws(() => {
  const body = weakenedRequestDecision;
  const a = pos(body, 'from public.business_intelligence_decisions');
  const b = pos(body, 'for update', a);
  const gate = pos(body, "v_decision_status is distinct from 'PROPOSED'");
  if (!(a >= 0 && b >= 0 && b < gate)) throw new Error('request decision lock missing');
}, /request decision lock missing/);

const weakenedRequestApproval = request.slice(0, reqApprovalLock) + request.slice(reqApprovalLock + 'for update'.length);
assert.throws(() => {
  const body = weakenedRequestApproval;
  const approvalLock = pos(body, 'for update', reqApproval + 1);
  if (approvalLock < 0) throw new Error('request approval lock missing');
}, /request approval lock missing/);

const weakenedDecide = decide.replace(/for update/i, '');
assert.throws(() => {
  const a = pos(weakenedDecide, 'from public.business_intelligence_decisions');
  const b = pos(weakenedDecide, 'for update', a);
  const gate = pos(weakenedDecide, "v_decision_status is distinct from 'PROPOSED'");
  if (!(a >= 0 && b >= 0 && b < gate)) throw new Error('decide decision lock missing');
}, /decide decision lock missing/);

console.log('Decision approval lock order: PASS (required locks present; each weakened-lock test fails closed).');
