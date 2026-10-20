# Master Execution Index — Batch 28 — 2026-08-25

## Starting point
Read `docs/MASTER_EXECUTION_INDEX.md` before execution. The prior Quality failure `32882131338` had already passed tenant, import, worker runtime, and Phase K/L/M gates before failing only because the K→S gate required Phase N–S entries that the historical roadmap did not contain.

## Root-cause fixes executed
1. Added `docs/IMPLEMENTATION_ROADMAP_PHASES_N-S.md` with explicit N–S execution scope: runtime recovery, adversarial security, document depth, KPI truth, decision/outcome loop, and final certification.
2. Updated `scripts/check-k-to-s-closure.mjs` so it validates the historical roadmap plus the N–S addendum instead of silently weakening the requirement.
3. Strengthened `scripts/report-execution-runtime.test.ts` with checkpoint monotonicity, source-snapshot idempotency identity, and fail-closed tenant/idempotency input tests.
4. Added `scripts/check-tenant-adversarial-contract.mjs` and wired it into Quality immediately after the existing legacy tenant guard. It rejects browser storage/query-string/browser-global/static tenant sources and client-selected tenant filters in executable application code.
5. Preserved the existing database-authoritative tenant model; the canonical import atomic wrapper already rejects any `p_company_id` that differs from `current_company_id()`.

## Proactive searches completed
- `COMPANY_ID`, static tenant IDs, tenantId/tenant_id, tenant_memberships.
- `supabase.from` consumers and RPC/import boundaries.
- KPI/data-lineage/query/dashboard surfaces.
- Lease/heartbeat/checkpoint/retry/dead-letter runtime.
- RPO/RTO and production certification surfaces.
- Cross-platform folder watcher/native adapter surfaces.

## Current known GAPs — not falsely closed
- Dashboard query surface still has presentation fallbacks for missing customer/product/category names; this remains a Phase Q root-fix target because missing business data must not be relabeled as a fabricated business value.
- Global KPI date-window semantics are still not implemented; the dashboard selector intentionally controls trend only.
- Windows/Android/iOS native runtime adapters are still integration targets; the existing canonical folder engine is not duplicated.
- P0 LIVE Supabase/security/recovery/production evidence remains required.

## CI state
Quality run `32882587567` (#1417) is queued on the master-index update commit `5878d399d768b9c02c1bdb6502d5155bd86bd8a4`.
A preceding run `32882553024` (#1416) was already in progress from recovery-test hardening commit `69b8cf318263ccb581bfe8766affd2b7bddc9d9d`.
No PASS is claimed until a completed run verifies the current source.

## Truth-weighted progress
Keep the conservative project figure at **~82% engineering completion**. This batch improves verified engineering depth and closes integration drift but does not create live production evidence, so no percentage inflation is allowed.

## Next parallel wave
While CI runs: continue Phase Q KPI truth root-fix investigation, Phase P document corpus/runtime proof preparation, Phase N/O adversarial/recovery hardening, and native watcher integration design against the existing adapter contract. Do not wait for CI to start these surfaces.
