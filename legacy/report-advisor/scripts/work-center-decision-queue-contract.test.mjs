import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/pages/WorkCenterPage.tsx', 'utf8');
const decisions = fs.readFileSync('src/lib/report-decisions.ts', 'utf8');

assert.ok(source.includes('DecisionWorkFilter'));
assert.ok(source.includes('قرارات تحولت إلى عمل'));
assert.ok(source.includes('decisionWorkItems'));
assert.ok(source.includes('fetchDecisionWorkItems'));
assert.ok(source.includes('reportExecutionJobId'));
assert.ok(source.includes('sourceHash'));
assert.ok(source.includes('overdue'));
assert.ok(source.includes('isOverdue'));
assert.ok(source.includes('decisionWorkFilter'));
assert.ok(source.includes('لماذا · الدليل · الإجراء · النتيجة'));
assert.ok(source.includes('md:hidden'));
assert.ok(source.includes('الدليل غير متاح'));
assert.ok(decisions.includes('decision_work_items'));
console.log('WORK_CENTER_DECISION_QUEUE_CONTRACT_PASS');
