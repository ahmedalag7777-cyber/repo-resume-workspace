# Adaptive Execution Governance — v4.0

This is Layer 3 of the execution system. It governs how execution strategy is measured and improved; it does not replace the Programmer Execution Protocol or the Master Execution Index.

## Layer separation
- **LAYER 1 — Programmer Execution Protocol:** mandatory execution behavior and enforcement.
- **LAYER 2 — Master Execution Index:** authoritative current state, historical ledger, blockers, dependencies, and execution map.
- **LAYER 3 — Adaptive Execution Governance:** evidence-based measurement of strategy effectiveness and controlled protocol evolution.

## Protocol precedence
The precedence order is mandatory:
`P0 — Safety / Security / Evidence Integrity`
`P1 — Exact-SHA / Truth / Certification Integrity`
`P2 — Current Master Execution Index`
`P3 — Adaptive Execution Governance`
`P4 — Programmer Execution Protocol`
`P5 — Current Batch Instructions`
`P6 — Convenience / Optimization`

A lower-priority instruction MUST NOT override a higher-priority safety, truth, evidence, certification, or exact-SHA constraint.

## EXECUTION PERFORMANCE LEDGER
Each batch records, where measured:
`BATCH ID | START HEAD | END HEAD | COMMAND STRATEGY | PARALLEL WINDOWS USED | PARALLEL TASKS EXECUTED | ACTIONABLE WORK FOUND | ACTIONABLE WORK CLOSED | EXECUTION DEBT BEFORE | EXECUTION DEBT AFTER | REMAINING WORK BEFORE | REMAINING WORK AFTER | NEW EVIDENCE | NEW CERTIFICATION READINESS | BLOCKERS ISOLATED | TESTS | ADVERSARIAL | REGRESSION | RESCAN | MISSED ACTIONS | PREMATURE STOPS | UNDER-UTILIZATION | PROTOCOL CHANGES`
Unknown measurements are recorded as `UNPROVEN` or `NOT MEASURED`; invented precision is forbidden.

## EXECUTION EFFECTIVENESS
Primary metric: `Actual Verified Closure / Actionable Work Available`.
Use `REAL MEASURED DATA > ESTIMATE > NO CLAIM`. When reliable numeric measurement is unavailable, classify effectiveness as `HIGH | MEDIUM | LOW | UNPROVEN` and state the evidence basis.
Commits, lines changed, report size, index size, and test count are not progress metrics by themselves.

## UNDER-EXECUTION DETECTION
Record an `UNDER-EXECUTION EVENT` when async work runs while independent actionable work exists and is not executed; executable NEXT+1/NEXT+2 is skipped; an external blocker leaves independent local work unexecuted; or a discovery has an executable fix but only a report is produced.
Repeated under-execution follows `OBSERVED PATTERN → RCA → STRATEGY CHANGE → RECORD CHANGE → APPLY NEXT BATCH → MEASURE RESULT`.

## OVER-EXECUTION / LOW-VALUE EXECUTION
Record `LOW-VALUE EXECUTION` for unnecessary mutation, duplicate work, redundant tests/audits/documentation/rechecks, or unsafe parallelism. High activity without meaningful Remaining Work reduction, evidence gain, or certification unlock is not progress.

## COMMAND QUALITY FEEDBACK
Evaluate `COMMAND → EXECUTION → RESULT` for closure size, iterations/rework, missed parallelism, evidence strength, and clarification burden. Repeated weak command patterns become strategy candidates rather than automatic rules.

## ADAPTIVE STRATEGY RULES
`ONE-OFF INCIDENT → RECORD`
`REPEATED PATTERN → CANDIDATE STRATEGY/RULE`
`PROVEN SYSTEMIC FAILURE → MANDATORY ENFORCEMENT RULE`
Protocol changes must never be silently introduced.

## CONTROLLED PROTOCOL EVOLUTION
Every accepted protocol evolution follows:
`OBSERVATION → EVIDENCE → RCA → PROPOSED RULE → CONFLICT CHECK → TEST → ADVERSARIAL → ACCEPT → VERSION → INDEX UPDATE`
Each evolution records `VERSION | DATE | TRIGGER | RCA | NEW RULE | OLD LIMITATION | TEST | RESULT`.

## STRATEGY MEMORY
Maintain successful and weak strategies. Proven effective strategies include, when applicable: parallel windows, dependency-aware scheduling, NEXT/NEXT+1/NEXT+2, adversarial-first review, test-of-test, blocker isolation, exact-SHA discipline, and automatic index synchronization.
Weak strategies MUST be marked and not reused without an explicit reason.

## BASELINE / RESULT
Before a large batch capture a `BASELINE`; after the batch capture `RESULT`. Compare Remaining Work, Execution Debt, Verified Gates, Runtime Readiness, Certification Readiness, and External Blockers. If no meaningful improvement is observed, classify the strategy as `INVESTIGATE`, not effective.

## SMART FRONT PRIORITIZATION
Each front is classified by `IMPACT | URGENCY | RISK | DEPENDENCY | EXECUTABILITY | CERTIFICATION UNLOCK` and assigned `P0 immediate | P1 current parallel window | P2 prepare | P3 external blocked | P4 low-value/defer`.
Prefer `High Impact / Low Dependency`; for `High Impact / Blocked`, prepare aggressively without claiming runtime proof.

## RELEASE-RELEVANT PROGRESS
Progress is measured by `RELEASE-RELEVANT CLOSURE + VERIFIED EVIDENCE + REMAINING WORK REDUCTION + CERTIFICATION UNLOCKS`.
Never optimize for percentage alone when a small remaining item carries high release or certification impact.

## GOVERNANCE TRUTH INVARIANTS
These are mandatory governance invariants, not advisory examples:
- `DISCOVERY ≠ CLOSURE`: an executable fix must be executed and verified before closure is claimed.
- `EVIDENCE IS EXACT-SHA BOUND`: evidence from an older SHA MUST NOT be transferred to a newer SHA.
- `UNPROVEN ≠ PASS`: missing runtime/operational proof remains UNPROVEN.
- `EXTERNAL BLOCKER ≠ LOCAL STOP`: external blockers isolate only dependent work; independent actionable work MUST continue.
- `INDEX-ONLY BOUNDARY`: a current HEAD may differ from the indexed code/test head only when ancestry is verified and every changed path is within the approved continuity-governance allowlist (`docs/MASTER_EXECUTION_INDEX.md`, `ONE-PROGRAMMER-SESSION-MEMORY.md`, `docs/MASTER_PRODUCT_REFERENCE.md`, and the governing index/enforcement test scripts); otherwise it is INDEX DRIFT.
- `INDEX UPDATE ≠ CAPABILITY CLOSURE`: documentation/history synchronization never counts as product capability progress by itself.

## E1–E8 STRATEGY MEMORY
For every cycle record what blocks E1–E8 and what can be prepared now. External availability must not create a thinking delay: when an operational window opens, execute the prepared handoff, capture evidence, consume the result, and continue.

## TRUE STOP EXTENSION
TRUE STOP additionally requires no high-value actionable work, no safe parallel work, no executable NEXT/NEXT+1/NEXT+2, no preparable external work, no under-execution event, no low-value loop, no new actionable finding, complete test/adversarial/regression/rescan, exact-SHA verification, current index, updated strategy memory, and remaining blockers genuinely external/human.

## v4.0 VERSION RECORD
| VERSION | DATE | TRIGGER | RCA | NEW RULE / CHANGE | OLD LIMITATION | TEST | RESULT |
|---|---|---|---|---|---|---|---|
| v4.0 | 2026-09-02 | v3.2 improved throughput but lacked explicit strategy-performance feedback and controlled layer separation | Execution could improve without measuring why; activity could be mistaken for progress | Add performance ledger, effectiveness, under/over-execution detection, command feedback, precedence, strategy memory, smart prioritization, controlled evolution, and governance truth invariants | v3.2 enforced execution behavior but did not formally govern strategy quality or explicitly bind all governance truth invariants | Governance contract + adversarial anchor tests + exact-SHA/index-only boundary attacks | IN-PROGRESS until fresh exact-head CI is consumed |
