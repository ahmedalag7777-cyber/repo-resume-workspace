# Execution Debt & Release Velocity — 2026-09-04 Current State

## Purpose
This is the live supplemental accounting contract for the autonomous execution protocol. The master execution index remains the authoritative ledger. This file records measurable/known execution debt, release velocity and the current owner/external boundary without converting activity into progress.

## BASELINE — 2026-09-04 02:35 +03
- Product-code/test candidate: `0fa2e6970c5203ca6a36dd7e076162d48a0488c5`.
- Previous product mutation: `e6f27cf5885acc6bb1e29e4cd977e274bad08f16`.
- Repository documentation/index synchronization followed the candidate.
- Engineering/product implementation: ~92% assessment.
- Operational/runtime evidence: ~76% assessment.
- Production certification readiness: ~58% assessment.
- Overall closure readiness: ~83% assessment.

## RESULT — 2026-09-04 02:48 +03
- New capability closure: compatibility-layer import history read bounded to 500 rows with exact count and explicit overflow failure.
- New regression: compatibility query path is now explicitly covered by the import-query-bound checker.
- New evidence record: `docs/EVIDENCE/2026-09-04_DEEP_FORENSIC_RESCAN_30H.md`.
- Current repository documentation HEAD after this record: `5642040e558e0a78c3befb7a14c853b341f669e2`.
- Product-code/test candidate remains `0fa2e697...`; documentation-only commits do not change the product candidate.
- No fresh Quality result exists for `0fa2e697...` in the consumed evidence; Quality therefore remains NOT CERTIFIED.

## EXECUTION DEBT

### ACTIONABLE DEBT — must execute
1. Fresh exact-head Quality/required CI for `0fa2e697...`.
2. Reconcile active release PRs #305 → #307 → #308 against current main; rebase/resolve conflicts and rerun exact-head evidence.
3. Continue RPC signature/consumer parity audit across canonical and compatibility paths.
4. Re-audit SECURITY DEFINER authority/EXECUTE decisions for the 19 authenticated-executable routines; do not blanket revoke.
5. Continue UI truth/RTL, import/export/report, worker, OCR, storage/realtime/AI and performance audits/preparation.
6. Prepare exact-head deployment/runtime evidence collectors and certification manifests.
7. Prepare owner handoff packets so the owner only performs protected/interactive actions.
8. Re-scan after every accepted mutation and consume asynchronous results immediately.

### EXTERNAL / OWNER DEBT — isolate and prepare
- Real authenticated Tenant A/B sessions.
- Supabase Auth leaked-password protection control-plane setting.
- Real backup + isolated restore + integrity + RPO/RTO.
- Authorized rollback + forward recovery.
- Windows native exact-head evidence if CI cannot provide it.
- Unavoidable protected production authorization.
- Current live Supabase mutations are also blocked in this connected session by insufficient connector permission; no workaround or secret handling is permitted.

## WAITING WINDOWS

An asynchronous operation creates a `WAITING WINDOW` with:
- operation;
- status;
- parallel window state;
- available independent work;
- work actually executed;
- result-consumption state.

A waiting window closes only when `result received AND result consumed AND new work evaluated`.

## CURRENT SCHEDULER

| TASK | DEPENDENCY | STATE | PARALLEL? | BLOCKER | CAN START NOW? | EXPECTED UNLOCK |
|---|---|---|---|---|---|---|
| Fresh Quality | none | OPEN | yes | none | yes | Current CI certification |
| PR #305 integration | current-main rebase | OPEN | no with #307/#308 mutation | branch overlap | yes, after baseline decision | security/product boundary |
| PR #307 integration | #305 | OPEN | no | dependency on #305 | no | test-of-test repair |
| PR #308 integration | #305/#307 | OPEN | no | overlap/non-mergeable | no | autonomy/exact-head certification |
| RPC/security audit | none | READY | yes | none | yes | defect list or PASS classification |
| OCR corpus preparation | none | READY | yes | corpus/runtime | yes | runtime proof when available |
| Worker recovery preparation | none | READY | yes | runtime environment only for final proof | yes | crash/recovery evidence |
| Storage/realtime/AI audit | scope | READY | yes | scope decision for implementation | yes | proof or explicit out-of-scope decision |
| Performance/scale analysis | none | READY | yes | representative data | yes | benchmark evidence |
| Authenticated E2E | real credentials | OWNER REQUIRED | sequential after current deployment | owner session | no | runtime certification |
| Backup/restore | protected control plane | OWNER REQUIRED | sequential | owner authorization | no | DR evidence |
| Rollback/forward recovery | protected deployment | OWNER REQUIRED | sequential | owner authorization | no | recovery certification |

## RELEASE VELOCITY

Velocity is measured only by capability/evidence closure movement across:
`Built → Integrated → Verified → Runtime Proven → Production Certified`.

The last 30h contain substantial **Verified/contract closure** and several live DB-boundary proofs, but the main remaining score drag is the Runtime Proven and Production Certified layers. Documentation commits, index synchronization and report volume are not counted as capability velocity.

## EXECUTION UTILIZATION

Known batch utilization:
- Async work existed during the closure period and independent security/database/test/governance work was executed rather than waiting.
- Parallel work executed: multiple independent security, worker, import, decision, governance and evidence fronts.
- Parallel work available: additional RPC/security/UI/OCR/performance/runtime-preparation fronts remain available.
- Execution debt after this record: **NOT ZERO** because the current-head CI/certification and several runtime/recovery fronts remain open.
- Premature TRUE STOP: **NOT ALLOWED** while actionable fronts remain.

## TRUE STOP

`EXECUTION DEBT = 0` is required before TRUE STOP for locally executable debt. TRUE STOP is forbidden while independent actionable work remains, while current-head CI is unconsumed, while INDEX DRIFT exists, or while E1–E8 has unprepared local work.

## RELEASE-RELEVANT RULE

`CI PASS ≠ Runtime PASS ≠ Production Certification`. Historical evidence never certifies a newer SHA. External debt isolates only the dependent operation; it never clears unrelated actionable debt.