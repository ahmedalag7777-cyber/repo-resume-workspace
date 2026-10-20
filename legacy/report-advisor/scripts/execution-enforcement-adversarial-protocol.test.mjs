import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { validateExecutionEnforcementProtocol } from './check-execution-enforcement-protocol.mjs';

const protocol=fs.readFileSync('docs/EXECUTION_ENFORCEMENT_PROTOCOL.md','utf8');
assert.doesNotThrow(()=>validateExecutionEnforcementProtocol(protocol));
const formatting=protocol.replaceAll('E-01 — Parallelism before reporting','e-01 —   parallelism   before   reporting').replaceAll('E-02 — NEXT+1 / NEXT+2 consumption','E-02 — next+1 / next+2 consumption');
assert.doesNotThrow(()=>validateExecutionEnforcementProtocol(formatting));
const attacks=[
 ['renamed rule',t=>t.replace('E-01 — Parallelism before reporting','E-01 — Parallel execution')],
 ['missing section',t=>t.replace('### E-08 — Test-of-test requirement','### E-08 — REMOVED')],
 ['comment-only decoy',t=>t.replace('### E-01 — Parallelism before reporting','<!-- ### E-01 — Parallelism before reporting -->')],
 ['weak NEXT+1',t=>`${t}\nNEXT+1 is optional and may be deferred when convenient.`],
 ['blocker stops unrelated',t=>`${t}\nA blocker may stop unrelated local work.`],
 ['old PASS transfer',t=>`${t}\nHistorical PASS transfers automatically to the next SHA.`],
 ['UNPROVEN promotion',t=>`${t}\nUNPROVEN may be promoted to PASS automatically.`],
 ['fake true stop',t=>t.replace('`TRUE STOP` is allowed only after','`TRUE STOP` is allowed before')],
 ['execution debt ignored',t=>`${t}\nExecution debt may be ignored when the report is otherwise complete.`],
 ['documentation closure',t=>`${t}\nAn index update counts as execution closure even without capability progress.`],
 ['waiting-for-CI stop',t=>`${t}\nWaiting for CI may stop the execution and return a report.`],
 ['parallel work skipped',t=>`${t}\nParallel work is optional and may be skipped while CI runs.`],
 ['compact evidence removed',t=>t.replace('### E-16 — Compact Evidence / Auditability','### E-16 — REMOVED')],
 ['identity rule removed',t=>t.replace(/### E-17 — Project Identity \/ Old Branding Integrity[\s\S]*?### E-18/,'### E-18')],
 ['certification provenance removed',t=>t.replace(/### E-18 — Certification Configuration Provenance[\s\S]*?### E-19/,'### E-19')],
 ['production safety removed',t=>t.replace(/### E-19 — Production Safety Boundary[\s\S]*?### Protocol-first execution order/,'### Protocol-first execution order')],
 ['protocol-first removed',t=>t.replace('### Protocol-first execution order','### Protocol-order removed')],
 ['external clears debt',t=>`${t}\nAn external blocker may clear execution debt.`],
 ['E-TIME removed',t=>t.replace(/### E-TIME[\s\S]*?### E-MAX/,'### E-MAX')],
 ['E-MAX removed',t=>t.replace(/### E-MAX[\s\S]*?### E-SCHED/,'### E-SCHED')],
 ['scheduler removed',t=>t.replace(/### E-SCHED[\s\S]*?### E-INDEX-HEAD/,'### E-INDEX-HEAD')],
 ['utilization removed',t=>t.replace(/### E-UTIL[\s\S]*?### E-EVOLVE/,'### E-EVOLVE')],
 ['debt distinction removed',t=>t.replace(/### E-DEBT[\s\S]*?### E-UTIL/,'### E-UTIL')],
];
for(const [name,mutate] of attacks)assert.throws(()=>validateExecutionEnforcementProtocol(mutate(protocol)),/Execution enforcement protocol rejected/,name);
for(const marker of ['CASE A:','CASE B:','CASE C:','CASE D:','CASE E:','CASE F:','CASE G:','CASE H:'])assert.throws(()=>validateExecutionEnforcementProtocol(protocol.replace(marker,marker.replace(':','')+' REMOVED:')),/Execution enforcement protocol rejected/,`missing ${marker}`);
console.log('PASS protocol adversarial test-of-test suite');
