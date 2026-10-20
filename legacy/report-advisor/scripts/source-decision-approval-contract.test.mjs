import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge = fs.readFileSync('src/lib/report-decisions.ts', 'utf8');
const surface = fs.readFileSync('src/components/SourceBoundReportSurface.tsx', 'utf8');
const approvalMigration = fs.readFileSync('supabase/migrations/20261002031000_enforce_approval_separation_of_duties.sql', 'utf8');

assert.ok(bridge.includes("request_decision_approval"));
assert.ok(bridge.includes("fetchSourceDecisionProposals"));
assert.ok(surface.includes("طلب الموافقة"));
assert.ok(surface.includes("PROPOSED"));
assert.ok(surface.includes("report.sourceHash"));
assert.ok(!surface.includes("create_decision_work_item"));
for (const marker of ['decide_approval','SELF_APPROVAL_FORBIDDEN','decided_by = v_user','set search_path = public, pg_catalog']) {
  assert.ok(approvalMigration.includes(marker), 'approval separation contract missing: ' + marker);
}
console.log('SOURCE_DECISION_APPROVAL_CONTRACT_PASS');
