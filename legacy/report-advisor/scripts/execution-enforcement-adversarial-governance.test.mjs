import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateAdaptiveGovernance, validateCurrentHeadIndex } from './check-execution-enforcement-protocol.mjs';

const governance=fs.readFileSync('docs/ADAPTIVE_EXECUTION_GOVERNANCE.md','utf8');
assert.doesNotThrow(()=>validateAdaptiveGovernance(governance));
const attacks=[
 ['layer separation',t=>t.replaceAll('Layer 3','Layer X').replaceAll('LAYER 3','LAYER X')],
 ['precedence',t=>t.replace('P0 — Safety / Security / Evidence Integrity','P0 — Convenience')],
 ['performance ledger',t=>t.replace('EXECUTION PERFORMANCE LEDGER','PERFORMANCE LEDGER REMOVED')],
 ['under execution',t=>t.replace(/## UNDER-EXECUTION DETECTION[\s\S]*?## OVER-EXECUTION \/ LOW-VALUE EXECUTION/,'## OVER-EXECUTION / LOW-VALUE EXECUTION')],
 ['low value',t=>t.replace('LOW-VALUE EXECUTION','LOW-VALUE REMOVED')],
 ['strategy memory',t=>t.replace('STRATEGY MEMORY','STRATEGY STATE')],
 ['measured data',t=>t.replace('REAL MEASURED DATA > ESTIMATE > NO CLAIM','USE ANY PERCENTAGE')],
 ['silent evolution',t=>t.replace('Protocol changes must never be silently introduced.','Protocol changes may be silent.')],
 ['one-off threshold',t=>t.replace('ONE-OFF INCIDENT → RECORD','SINGLE INCIDENT → RECORD')],
 ['precedence weakening',t=>t.replace('A lower-priority instruction MUST NOT override a higher-priority safety, truth, evidence, certification, or exact-SHA constraint.','A lower-priority instruction may override a higher-priority constraint.')],
 ['discovery closure',t=>t.replace('an executable fix must be executed and verified before closure is claimed.','an executable fix may be reported as closure without execution.')],
 ['evidence transfer',t=>t.replace('evidence from an older SHA MUST NOT be transferred to a newer SHA.','evidence from an older SHA may be transferred to a newer SHA.')],
 ['unproven pass',t=>t.replace('missing runtime/operational proof remains UNPROVEN.','missing runtime/operational proof may be treated as PASS.')],
 ['external blocker stop',t=>t.replace('independent actionable work MUST continue.','independent actionable work may stop.')],
 ['index-only boundary',t=>t.replace('every changed path is within the approved continuity-governance allowlist (`docs/MASTER_EXECUTION_INDEX.md`, `ONE-PROGRAMMER-SESSION-MEMORY.md`, `docs/MASTER_PRODUCT_REFERENCE.md`, and the governing index/enforcement test scripts)','changed paths may include source code')],
 ['index update closure',t=>t.replace('never counts as product capability progress by itself.','counts as product capability progress by itself.')],
];
for(const [name,mutate] of attacks)assert.throws(()=>validateAdaptiveGovernance(mutate(governance)),/Adaptive governance rejected/,name);

const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const parent = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
const staleIndex = `## historical execution notes\n- CURRENT CODE/TEST CANDIDATE: \`0000000000000000000000000000000000000000\`.`;

assert.doesNotThrow(() => validateCurrentHeadIndex(staleIndex, head, parent));
assert.throws(() => validateCurrentHeadIndex(staleIndex, parent, ''), /differs from checked-out repository HEAD/);
assert.throws(() => validateCurrentHeadIndex(staleIndex, head, '0'.repeat(40)), /differs from checked-out HEAD parent/);

console.log('PASS governance + exact-SHA/index-only adversarial test-of-test suite');
