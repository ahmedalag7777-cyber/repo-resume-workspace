# Autonomous Execution Enforcement Protocol — v3.2 + v4.0 Governance

This contract is Layer 1 of the execution system. It strengthens `docs/MASTER_EXECUTION_INDEX.md` without deleting or rewriting historical ledger entries. Layer 3 strategy governance is defined separately in `docs/ADAPTIVE_EXECUTION_GOVERNANCE.md`.

## Mandatory enforcement rules

### E-01 — Parallelism before reporting
If an independent safe executable front exists while another front is waiting on CI or an external dependency, execute the independent front before returning a report.

### E-02 — NEXT+1 / NEXT+2 consumption
When NEXT+1 or NEXT+2 is deterministic and actionable in the same execution context, execute it in the same continuous mission. A completed NEXT item is not a reporting boundary.

### E-03 — Blocker isolation
An external blocker is scoped only to the capability that actually requires it. It MUST NOT stop unrelated local security, database/RPC, tests, evidence, release preparation, or handoff work.

### E-04 — Discovery is not closure
A finding is not closed by discovery or documentation. Where actionable, closure requires RCA → FIX → targeted test → test-of-test where applicable → adversarial regression → regression → rescan.

### E-05 — Gate integrity
Checker drift must be classified as STALE CONTRACT versus REAL PRODUCT DEFECT. Stale contracts are aligned to canonical implementation without weakening assertions; canonical-path and decoy/bypass tests are mandatory.

### E-06 — Exact-SHA evidence boundary
Every mutation creates a new evidence boundary. PASS, artifacts, runtime evidence, and certification claims from an older SHA MUST NOT be promoted to a newer SHA.

### E-07 — Runtime truth separation
Static, mocked, deterministic, and source-level capability evidence MUST NOT be represented as live runtime proof. Backup, restore, RPO, RTO, rollback, DR, authenticated E2E, and live tenant isolation remain unproven until their real operational evidence exists.

### E-08 — Test-of-test requirement
For security- and certification-critical checks, verify both the canonical valid path and at least one decoy/bypass/malformed path that the checker must reject.

### E-09 — Remaining-work accounting
Execution progress is measured by resolved capability/evidence/certification gaps, not commit count, line count, or index updates.

### E-10 — Index governance
The master index remains append-only historical ledger + live state map + execution contract. Current-state edits must preserve historical SHA/RCA/evidence/blocker records.

### E-11 — True-stop gate
`TRUE STOP` is allowed only after safe local work, parallel work, NEXT/NEXT+1/NEXT+2, adversarial checks, regression, rescan, exact-head verification, index update, execution-debt review, external blocker isolation, executable handoff preparation, and waiting-window exhaustion are exhausted.

### E-12 — Automatic protocol evolution
When execution exposes a repeatable under-execution pattern, add a stronger enforcement rule, preserve the prior history, test the new enforcement path where practical, and apply it immediately.

### E-13 — Behavioral enforcement matrix
The contract must explicitly reject execution behavior that stops early even when work remains. The following cases are mandatory and are executable test inputs, not prose-only examples:

CASE A: CI waiting + independent task exists → MUST NOT stop.
CASE B: NEXT complete + NEXT+1 executable → MUST NOT stop.
CASE C: NEXT+1 complete + NEXT+2 executable → MUST NOT stop.
CASE D: one external blocker + unrelated local work exists → MUST NOT stop unrelated work.
CASE E: discovery made + executable fix exists → MUST NOT report discovery-only closure.
CASE F: mutation made + adversarial test missing → MUST NOT declare closure.
CASE G: new SHA + old evidence → MUST reject evidence transfer.
CASE H: index updated + no capability progress → MUST NOT count as execution closure.

### E-14 — Execution Debt zero-gate
`EXECUTION DEBT` records actionable but not executed work, skipped parallel work, skipped NEXT+1/NEXT+2, deferred adversarial/test-of-test work, and known executable follow-ups. `EXECUTION DEBT = 0` is mandatory for TRUE STOP when the debt is locally executable. External blockers do not erase execution debt for unrelated local work.

### E-15 — Release Velocity truth metric
`RELEASE VELOCITY` measures closure movement across `Built`, `Integrated`, `Verified`, `Runtime Proven`, and `Production Certified`. Commits, lines changed, documentation updates, and report count are not velocity. A cycle that does not reduce Remaining Work or increase valid evidence/certification readiness must expose zero closure velocity.

### E-TIME — Waiting-Time Parallelization
When any asynchronous operation is running, including CI, Quality, Final Batch, build, deployment, workflow, test, API request, external verification, or similar operation, elapsed time is an execution window. If independent actionable work exists, it MUST be executed before returning or waiting for the asynchronous result. `waiting for CI`, `waiting for test`, `waiting for deployment`, and `waiting for workflow` MUST NOT be stop conditions while independent actionable work exists. When the asynchronous operation completes, its result MUST be consumed immediately and execution MUST continue.

### E-MAX — Maximum Safe Parallelism
At every execution point, schedule the maximum number of independent safe actionable tasks without creating conflicting mutations, races, unsafe shared-file writes, or ambiguous evidence lineage. Tasks sharing a mutation chain or exact-head dependency MUST run sequentially. Independent tasks MUST be treated as parallel-ready.

### E-SCHED — Dependency-Aware Scheduling
The execution scheduler MUST track each task as `TASK`, `DEPENDENCY`, `STATE`, `PARALLEL?`, `BLOCKER`, `CAN START NOW?`, and `EXPECTED UNLOCK`. `READY + INDEPENDENT = EXECUTE NOW`. External blockers isolate only the dependent task; preparation and independent validation remain executable.

### E-INDEX-HEAD — Current-Head Index Gate
If the live index current exact HEAD differs from the repository current exact HEAD, the state is `INDEX DRIFT`. The index MUST be refreshed while preserving all historical ledger entries. `INDEX DRIFT` forbids TRUE STOP and certification readiness until reconciled and verified.

### E-DEBT — Actionable vs External Debt
Execution debt MUST distinguish `ACTIONABLE DEBT` from `EXTERNAL DEBT`. Actionable debt MUST be executed. External debt MUST be isolated, prepared where possible, and documented; it MUST NOT suppress unrelated actionable work.

### E-UTIL — Execution Utilization
Release Velocity accounting MUST expose async operations running, parallel work executed, parallel work available, execution debt closed, and remaining work reduced. Waiting time with available independent work but zero execution is an under-utilization condition, not progress.

### E-EVOLVE — Automatic Protocol Evolution
When execution reveals a repeatable protocol weakness, the agent MUST `OBSERVE → RCA → DEFINE NEW RULE → UPDATE INDEX → ADD ENFORCEMENT → ADD TEST → ADD TEST-OF-TEST → ADVERSARIAL → REGRESSION → RESCAN`, then apply the rule immediately. This rule is permanent v3.x behavior.

## Layer precedence

The execution system has three distinct layers. Layer 1 defines mandatory programmer behavior; Layer 2 is the authoritative master execution state; Layer 3 governs strategy measurement and controlled improvement. The formal precedence is `P0 Safety / Security / Evidence Integrity > P1 Exact-SHA / Truth / Certification Integrity > P2 Current Master Execution Index > P3 Adaptive Execution Governance > P4 Programmer Execution Protocol > P5 Current Batch Instructions > P6 Convenience / Optimization`. A lower-priority instruction MUST NOT override a higher-priority constraint.

## v4.0 governance binding

`docs/ADAPTIVE_EXECUTION_GOVERNANCE.md` is mandatory Layer 3. It defines `EXECUTION PERFORMANCE LEDGER`, `EXECUTION EFFECTIVENESS`, `UNDER-EXECUTION EVENT`, `LOW-VALUE EXECUTION`, `COMMAND QUALITY FEEDBACK`, `STRATEGY MEMORY`, `BASELINE`, `RESULT`, `SMART FRONT PRIORITIZATION`, and controlled protocol evolution. The governance layer MUST use measured data when available and MUST use `HIGH | MEDIUM | LOW | UNPROVEN` rather than invented percentages when measurement is insufficient.

## Current application

The 2026-09-02 execution sweep established v3.2 time-aware execution enforcement. v4.0 now adds a separate adaptive governance layer so execution strategy can be measured without conflating activity with release progress, while preserving exact-SHA, safety, evidence, and certification precedence.


## v4.1 Governance — Compact Evidence and Project Identity

### E-16 — Compact Evidence / Auditability
Execution evidence MUST be stored first in the canonical compact record whenever that record can represent the state without loss of auditability. Repeated cycle reports MUST NOT be created when an existing canonical record can be updated. Raw CI logs and large outputs MUST remain outside the repository unless a specific certification claim requires them. Historical evidence required to prove a change, decision, failure, repair, security finding, or certification state MUST be retained; obsolete/redundant material MAY be compacted or archived without deleting the audit trail. Every compact state entry MUST preserve the minimum lineage: `DATE → EXACT HEAD → ACTION → RESULT → BLOCKER → NEXT`. Storage reduction MUST NOT remove evidence required for certification.

### E-17 — Project Identity / Old Branding Integrity
The canonical project identity is **الأغبري**. The legacy branding **العامري** is NOT an approved current project/UI identity. Any Frontend/UI/Branding audit MUST perform `OLD BRANDING → SEARCH → CLASSIFY → REMOVE/REPAIR → VERIFY → REGRESSION`. Current frontend surfaces, application metadata, titles, navigation, logos/alt text, and documentation representing current identity MUST use **الأغبري**. Historical evidence may preserve legacy wording when required to explain history; such historical wording MUST NOT be treated as current branding.

### E-18 — Certification Configuration Provenance
Certification configuration MUST be sourced from existing canonical configuration or explicit Owner Input. Missing certification URLs, endpoints, buckets, objects, target identities, or credentials MUST remain `OWNER INPUT REQUIRED` / `NOT AVAILABLE`; fabricated values, inferred Production targets, and synthetic operational endpoints are forbidden. Staging MUST NOT be substituted for Production merely to satisfy a certification gate.

### E-19 — Production Safety Boundary
No Production binding, database, authentication, authorization/RLS, migration, restore, rollback, infrastructure, or privileged-credential mutation may be performed solely to clear a certification blocker without explicit Owner Approval. Discovery of a required Production mutation is a stop at the safety boundary, not a certification PASS.

### Protocol-first execution order
Before any Audit, Mutation, Certification, or execution decision, the agent MUST read the canonical Layer 1 protocol, the current Layer 2 Master Execution Index, and the Layer 3 Adaptive Execution Governance; then `READ CURRENT STATE → AUDIT → CLASSIFY → EXECUTE → TEST → BYPASS SEARCH → REGRESSION → VERIFY → EVIDENCE → UPDATE CANONICAL RECORD → COMMIT`. A conversation instruction MUST NOT override a higher-precedence repository protocol rule.
