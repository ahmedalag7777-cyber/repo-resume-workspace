import assert from 'node:assert/strict';
import { evaluateDecisionBatch } from '../src/lib/free-toolbox/batch-decision-engine.ts';

const rows=Array.from({length:50000},(_,i)=>({groupId:`g${i%500}`,stock:i%900,forecastDaily:20+(i%80),targetDays:14,lostUnits:i%100,liquidityScore:i%101,continuityRisk:(i*3)%101,seasonalityScore:(i*7)%101,confidence:70}));
const started=performance.now();
const summary=evaluateDecisionBatch(rows);
const elapsed=performance.now()-started;
assert.equal(summary.rows,50000);
assert.ok(summary.averagePriority>0);
assert.ok(summary.reorder>0);
assert.ok(summary.critical>=0);

assert.throws(
  () => evaluateDecisionBatch([{...rows[0],forecastDaily:Number.NaN,groupId:'invalid-demand'}]),
  /INSUFFICIENT_DECISION_DATA:invalid-demand:forecastDaily/,
);
assert.throws(
  () => evaluateDecisionBatch([{...rows[0],liquidityScore:101,groupId:'invalid-score'}]),
  /INSUFFICIENT_DECISION_DATA:invalid-score:liquidityScore/,
);

console.log(`batch decision fixture: PASS (${elapsed.toFixed(1)}ms, ${rows.length} rows, invalid-input fail-closed)`);
