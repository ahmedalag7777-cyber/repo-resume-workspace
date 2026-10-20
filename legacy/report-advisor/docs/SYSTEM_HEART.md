# SYSTEM HEART — الأغبري / Report-Advisor
Version: 1.0
Status: CANONICAL CONTROL PLANE

## 0. Purpose
This is the control plane of the project. It does not replace product, architecture, UI, runtime, or commercial references. It decides which canonical source owns each class of truth, how sessions start, how work is allocated, how evidence is accepted, and how legacy knowledge is consolidated without loss.

## 1. Authority hierarchy
1. Git repository state / exact SHA is the final technical truth.
2. This file is the operating constitution and canonical-file router.
3. ONE-PROGRAMMER-SESSION-MEMORY.md is the only mutable live session state.
4. docs/MASTER_EXECUTION_INDEX.md is the single progress/backlog/sequence index.
5. Domain masters own detailed truth for their domains.
6. docs/PROJECT_KNOWLEDGE_MANIFEST.md is the lineage and consolidation ledger; it is never a content authority.
7. Legacy documents are source material until the Manifest proves their content was absorbed.
8. Chat text and old reports are context only, never proof.

When two sources disagree: verify the exact repository state, then resolve the conflict into the proper canonical owner. Never silently choose the older document.

## 2. Canonical control-plane files
| Role | Canonical file | Owns |
|---|---|---|
| System heart | docs/SYSTEM_HEART.md | authority, startup, allocation, anti-drift, consolidation law |
| Live state | ONE-PROGRAMMER-SESSION-MEMORY.md | current session result, blockers, resume pointer |
| Progress index | docs/MASTER_EXECUTION_INDEX.md | current execution boundary, backlog, completed/blocked gates |
| Product | docs/MASTER_PRODUCT_REFERENCE.md | product identity, IA, product rules, value model |
| UI/UX | docs/MASTER_UI_UX_REFERENCE.md | complete surface map, design system, component/state completeness |
| Engineering | docs/MASTER_ENGINEERING_ARCHITECTURE.md | canonical technical architecture and allowed paths |
| Data/security | docs/MASTER_DATA_TRUTH_SECURITY.md | truth, DB, RLS, tenant, provenance, deterministic calculation rules |
| Runtime/certification | docs/MASTER_RUNTIME_CERTIFICATION.md | CI, deployment, E2E, certification, resilience, recovery |
| Commercial | docs/MASTER_COMMERCIAL_REFERENCE.md | commercial moat, value proof, packaging, demo/proposal logic |
| Knowledge map | docs/PROJECT_KNOWLEDGE_MANIFEST.md | all legacy-source mapping, merge status, deletion gates |

No new competing master may be created without deliberately amending this table.

## 3. Session startup — mandatory order
A. Read SYSTEM_HEART.
B. Read the first/current block of ONE-PROGRAMMER-SESSION-MEMORY.
C. Read MASTER_EXECUTION_INDEX current boundary.
D. Read only the domain masters required by the current work fronts.
E. Verify GitHub main exact HEAD directly.
F. Reconcile memory/index SHA against GitHub.
G. Derive NEXT EXECUTABLE ACTION from the newest state, not from an old checklist.
H. Start two execution lanes immediately.

A session is invalid if it starts from an old task list without reconciling the live Git state.

## 4. Two-lane 50/50 execution policy
### Lane A — 50%: complete the product surfaces
Work continuously toward complete, coherent, commercially credible UI coverage:
- App Shell / RTL / responsive behavior
- all eight canonical product zones
- every canonical route/surface
- navigation and progressive disclosure
- real data binding
- loading / empty / error / review / blocked / insufficient-data states
- tables, filters, search, drawers, dialogs, charts and actions
- accessibility, keyboard flow and mobile/PWA behavior
- evidence/trust disclosure
- next-action and decision affordances
- import/document UX
- no placeholder/mock business truth

### Lane B — 50%: close the product heart
Work in parallel on the highest-value non-UI front:
- backend/runtime
- import pipeline
- database/RLS/tenant isolation
- deterministic metrics
- evidence/provenance
- decision/intelligence
- tests/contracts
- CI/certification
- resilience/recovery
- deployment
- cleanup/consolidation

The 50/50 rule is a planning constraint, not permission to invent work. When one lane is blocked, spend the available time in the other lane while preserving the ratio across the session as closely as practical.

Every session write-back must report actual delivery in both lanes.

## 5. Parallel execution model
Use concurrent fronts only when they do not conflict, dependencies are known, and evidence can remain bound to exact SHAs.

Prefer:
- UI + backend contract
- UI + targeted regression
- documentation consolidation + source audit
- CI/certification + independent product closure

Avoid:
- duplicate importers
- duplicate RPCs
- duplicate runners
- duplicate certification gates
- competing design systems
- parallel edits to one canonical source without a merge strategy

## 6. Exact evidence law
Accepted states:
- PASS = executed and proven on the exact relevant SHA/environment.
- FAIL = executed and defect reproduced.
- BLOCKED = proof prevented by an external or authorization constraint.
- NOT PROVEN = insufficient evidence.

Forbidden conversions:
- static contract -> runtime PASS
- API PASS -> browser PASS
- preview -> production
- staging -> production
- old SHA -> new SHA
- absence of error -> business success
- fixture/mock -> real persistence

## 7. Consolidation law
Legacy knowledge is never deleted first.

Required sequence:
1. Inventory source.
2. Classify domain.
3. Extract unique rules, requirements, decisions, evidence, invariants and unresolved risks.
4. Trace references/dependencies.
5. Merge content into the correct canonical owner.
6. Verify that no unique information remains outside the owner.
7. Update the Manifest with source SHA and absorbed sections.
8. Run affected contracts/tests.
9. Only then mark the source ARCHIVE or REMOVE.
10. Delete only in a separate controlled change after the previous gate is proven.

No document may be deleted merely because its filename looks old or duplicated.

## 8. Anti-regression rule for knowledge
A canonical file must be more complete than every source it replaces.

A consolidation is incomplete when:
- a requirement disappears;
- an exception disappears;
- historical rationale disappears;
- a test/gate reference disappears;
- an unresolved blocker disappears;
- a dependency becomes untraceable;
- a current implementation constraint is omitted.

## 9. Code consolidation law
KEEP / IMPROVE / REPLACE / REMOVE.

Before REMOVE:
- search references/callers
- inspect workflows/tests/migrations/RPCs
- preserve required behavior
- re-run affected gates

Never solve duplication by adding a wrapper around another duplicate.

## 10. Resume-position protection
The session may never restart from an earlier phase simply because an old document lists it.

Restart algorithm:
Git HEAD -> latest live memory -> execution boundary -> open gates -> blocked dependencies -> independent fronts -> NEXT EXECUTABLE ACTION

If a newer session record says a front is closed, do not reopen it unless a current-SHA regression or environment change proves it reopened.

## 11. Definition of done
DISCOVER -> DIAGNOSE -> EXECUTE -> TEST -> PROVE -> RECORD -> RESCAN -> CONTINUE

A front is complete only when:
- the change is real;
- the relevant test was run;
- evidence is exact;
- implementation is source-verified;
- regressions were checked;
- documentation/current-state was updated;
- the next executable action is known.

## 12. Fail-closed external blockers
For missing secrets, invalid external credentials, hosting limits or unavailable services:
- never guess;
- never weaken the gate;
- never fabricate evidence;
- isolate the blocker;
- continue independent work;
- resume only after the cause changes.

## 13. Product north star
الأغبري / Report-Advisor — Business Decision Operating System

Core chain:
Data -> Truth -> Evidence -> Signal -> Decision -> Approval -> Action -> Outcome -> Learning -> Benchmark

No canonical document may redefine the product into generic BI, CRUD, ERP, chatbot, a single industry, or a mock dashboard.

## 14. Mandatory end-of-session behavior
- update live memory;
- update execution index when the execution boundary changes;
- update affected domain master when canonical knowledge changes;
- update the Manifest when consolidation status changes;
- record both 50% UI and 50% core outcomes;
- leave one clear resume pointer;
- leave one next executable action set.



## 15. Fixture Intake + Post-Import Acceptance

The canonical reusable fixture intake directory is:

`tests/fixtures/realistic-reports/`

Use `tests/fixtures/business-golden/` when its fixtures are part of the active acceptance set.

At every session start, inspect these directories on the exact HEAD. Their presence is an executable test input source, not a request for owner instructions.

When a new fixture/report file is present, the programmer MUST treat it as an acceptance input and execute the existing canonical import path:

`UPLOAD → SECURITY → DETECTION → EXTRACTION → UNDERSTANDING → SPECIALTY → MATCHING/NORMALIZATION → QUALITY → TRUST → REVIEW → APPROVAL → COMMIT → ANALYSIS → EVIDENCE → SIGNAL → DECISION → ACTION → OUTCOME/LEARNING → BENCHMARK`

The durable execution proof remains exactly nine ordered stages:

`queued → fingerprinted → extracted → canonicalized → validated → analyzed → decisioned → committed → rendered`

The current implementation creates the nine durable tasks and advances them sequentially through the leased worker. Do not describe this as parallel multi-worker processing unless the runtime contract changes and fresh evidence proves that change.

After a fixture reaches `rendered`, the result UI MUST expose the real next outputs derived from the detected specialty/entity:
- Executive Report as the governed aggregation surface.
- The applicable specialty/domain report when one exists.
- Evidence Passport / Trust & Evidence.
- Decision surface.
- Work Center.
- Outcome/Learning / Business Replay.
- Benchmark eligibility, fail-closed to `INSUFFICIENT_SAMPLE` when peer evidence is absent.

A report link is not proof that its content is source-bound. Source-bound claims require the canonical import/evidence context. PARTIAL/REVIEW/BLOCKED states must route back to evidence/review rather than being presented as verified business truth.

Fixtures are test inputs only. They must never be promoted to production truth merely because import succeeded. Never create a separate importer, RPC, runner, or report pipeline for a fixture specialty when the canonical path already exists.

## 16. Absorbed execution protections from the former autonomous protocol

### Production mutation safety
Production-impacting mutation is prohibited unless target identity and authorization are proven. Before any production mutation prove:
- intended Vercel project/deployment
- intended Supabase project
- environment binding
- database target
- authentication target
- backup/recovery posture where relevant

Read-only forensics may proceed autonomously.

### Test sequencing
Prefer:
1. typecheck/build/lint as applicable
2. targeted unit/contract test
3. API/RPC boundary
4. real persistence/readback
5. browser E2E for affected UI/business flow
6. release/certification gate after prerequisites

### Blocker-local / session-global rule
A blocker is local to the affected front, not a stop condition for the session. Record the exact blocker, continue independent repository/UI/security/data/contract/runtime/documentation/cleanup fronts, rescan later, and resume automatically when the prerequisite changes.

The session stops only when no safe actionable front remains or every remaining front requires explicit owner authority.

### Anti-gaming rules
Never:
- change a broken test merely to obtain PASS
- delete a failing scenario without contract justification
- hide failures behind ignore/catch behavior
- replace real persistence with mocks
- use stale evidence
- change environment selection only to make a check pass
- report deployment readiness as application correctness
- claim certification with an unresolved mandatory gate

### Documentation is implementation
Every meaningful execution batch records exact SHA, change, rationale, evidence/run IDs, resulting state, blockers, and next executable work. Historical evidence is preserved when auditability requires it.
