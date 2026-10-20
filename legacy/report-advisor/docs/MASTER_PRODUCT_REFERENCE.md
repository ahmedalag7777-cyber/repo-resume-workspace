## IMPLEMENTATION UPDATE — 2026-09-25 / CURRENT GOVERNED STATE

- Current code/test candidate: `ddd9382f347cc02eb401fee75a9df48beaae7f05` (restore-safe RLS qualification fix discovered by live Phase-F backup/restore).
- Fresh local contracts: migration schema audit PASS (254 migrations / 0 findings); decision/intelligence runtime closure PASS; route/sidebar parity 39/37 PASS; Product WOW, Connections/Language, Executive Dashboard, Intelligence and Executive Report contracts PASS; TypeScript and Vite production build PASS.
- Fresh exact Phase-F artifact `phase-f-readiness-d5c618a9`: canary PASS; production deployment SHA mismatch `7be9f014...` vs exact head `d5c618a9...`; logical backup/restore failed at the unqualified `decision_action_receipts_tenant` policy; rollback drill returned 503. The source migration was corrected at `ddd9382f...`.
- Current Vercel production is `dpl_F4nkx3kwgxgncjre1Mo34sfp8448` on `7be9f01491384e641f32b31b2753c46fd32f7128`; GitHub main is `7159553fcfc9d21304ffff60e1086a34b714ac09`. No production evidence is transferred to the candidate.
- UI consolidation closed: Recommendations + Forecasts now live in canonical `src/pages/IntelligencePage.tsx`; duplicate `src/pages/IntelligencePages.tsx` was removed and App imports were rebound.
- Data truth UI closure closed the real blank fallthroughs for Dashboard/Command Center/Liquidity/Receivables/Reports/Inventory/Profitability and is guarded by the Product WOW contract.
- Quality governance now executes `test:knowledge-architecture` in the canonical Quality workflow.
- Core Phase-F restore defect closed in source: repository had duplicate 14-digit migration versions; content-bearing migrations were resequenced without dropping SQL, redundant empty remote-lineage aliases were removed, and the migration schema audit now rejects duplicate versions.
- Exact local repaired-branch migration audit: 285 migrations / 0 findings. This is source/local evidence only and does not certify live restore, RPO, RTO, or rollback.
- Live Phase-F baseline before the migration repair: authenticated canary PASS; tenant-canary PASS; operational health failed on deployment SHA mismatch; backup/restore failed on duplicate migration version `20260819210000`; rollback-forward-fix failed 503.
- Current production runtime remains fail-closed because the latest READY production deployment serves older SHA `1d88b083c6c956abb42e2b2db2d5d816cb543344`, while the current code candidate is `647f3ced71166386cb55f72942b865d3c902aabe`. No current-head production proof or measured RPO/RTO/rollback is claimed.
- Current hosting boundary: Vercel free-plan deployment rate limit (`api-deployments-free-per-day`) remains external. Netlify can produce exact PR previews but they are not production/Phase-F target identity proof.
- Product rule remains unchanged: never transfer historical runtime PASS across SHAs; deterministic business truth and fail-closed states remain canonical.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 65 — DASHBOARD HOOK ORDER + CERTIFICATION REBIND

- Exact code/test candidate: 30cf5d6ecf5a91e65642a38df31087498f4e356c.
- REAL FIX: Dashboard next-action derivation now obeys React Hooks ordering and remains null-safe while the snapshot is loading/error-bound.
- CONTRACT: Product WOW UI guard enforces the hook before early returns.
- REAL GOVERNANCE FIX: Master Execution Index is rebound with the canonical CURRENT_CODE_TEST_CANDIDATE token to prevent historical candidate selection.
- NO ARCHITECTURE CHANGE: no route/RPC/runner/importer/tenant/database path was created or replaced.
- NEXT: consume fresh exact-head certification/enforcement and continue Phase-F recovery evidence.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 64 — WORK CENTER BOUNDED HISTORY UX

- Exact code HEAD: `e7e153c7e69b82eca15457a6325f110b3df00aea`.
- REAL UI CHANGE: Work Center now distinguishes the current bounded history window from a full tenant-wide total. When 500 rows are present, the UI explicitly says `أحدث 500` and explains that older records remain outside the current display window.
- CONTRACT: Product WOW UI guard now protects the bounded-window disclosure and prevents regression to `إجمالي السجل` semantics.
- NO ARCHITECTURE CHANGE: existing import/history query and canonical paths remain unchanged.
- RUNTIME STATUS: no current-head CI/build/browser PASS is claimed for `e7e153c...`.
- NEXT: fresh exact-head verification, then Phase-F live resilience configuration and recovery evidence.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 63 — DASHBOARD CURRENT-TRUTH NEXT ACTION

- Exact code HEAD: `476c4bb827c3a2d485726af6b2e5d3e5391ff33a`.
- REAL UI CHANGE: Dashboard now derives a single next action from current truth/state: insufficient evidence → data quality; pending decisions → decision review; unread signals → command center; no calculable trend → source analysis; otherwise analytics.
- REAL UI CHANGE: the decision brief and bottom NEXT ACTION surface both consume that derived action, including rationale text and canonical destination.
- CONTRACT: `scripts/check-product-wow-ui-contract.mjs` now guards the derived action hook, route binding, and rationale binding.
- NO ARCHITECTURE CHANGE: no new route, RPC, runner, importer, tenant path, or calculation engine was introduced.
- RUNTIME STATUS: no current-head CI/build/browser PASS is claimed yet for `476c4bb...`; old runtime evidence remains historical.
- NEXT: obtain fresh exact-head verification for `476c4bb...`; separately close the external Phase-F live resilience configuration and consume real backup/restore/RPO/RTO/rollback evidence.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 62 FINAL — IMPORT RUNTIME CLOSED, PHASE-F BLOCKER BOUND

- Exact-head Browser E2E on `84a62e169ce8db61d2dc6598e654127543ecdabb` is **PASS**.
- The verified browser run proved the unified import product path through exact build/start/auth and real persistence evidence. The underlying import job committed one canonical row with provenance; the only prior failure was history rendering at scale.
- The decisive DB performance repair is now permanent: `idx_import_jobs_company_created_id` exists in staging and is represented by migration `20260921194500_import_history_recent_window_index.sql`.
- Main baseline `5367346...` has fresh PASS for quality, final certification, enforcement, final execution, and storage isolation.
- Phase-F was executed through closed PR #611. Pre-live resilience contracts and canary authentication passed; live probes correctly stopped fail-closed because the live resilience configuration is incomplete. Missing configuration includes `RESILIENCE_MAX_RPO_SECONDS` plus backup/restore runtime credentials/target configuration.
- No product architecture was weakened or bypassed. No old runtime evidence was transferred.
- NEXT: provision the required live resilience configuration, rerun Phase-F, then consume real restore/RPO/RTO/rollback evidence and close the remaining worker/server-boundary → tenant A/B → server OCR → watched-folder gates.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 61 — IMPORT HISTORY DATABASE PERFORMANCE

- Exact current code/test candidate: `84a62e169ce8db61d2dc6598e654127543ecdabb`.
- Exact-head Browser E2E on `f6d6...` proved the unified import commit path but still timed out waiting for the history file row at the UI boundary.
- DB inspection found the decisive scale issue: 4,471 tenant import jobs and no composite index for `company_id + created_at DESC + id ASC`.
- FIXED: added and applied migration `20260921194500_import_history_recent_window_index.sql`, creating `idx_import_jobs_company_created_id`.
- DB verification: index exists in staging after migration application.
- No change to canonical import commit semantics, tenant authority, calculations, or duplicate paths.
- NEXT: fresh exact-head Browser E2E on `84a62...`; if history passes, proceed to real business persistence/tenant A↔B checks and then Phase-F/RPO-RTO.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 60 — IMPORT HISTORY SCALE CLOSURE

- Exact current code/test candidate: `f6d6e64b5da8411ec7bcc49fe912a0af04db86aa`.
- A real exact-head browser run proved the unified import path itself persisted successfully (job completed, committed row, canonical record, provenance), then exposed a scale defect in the import history UI for a tenant with 4,471 import jobs.
- Root cause: the bounded latest-500 query still requested an exact total count and deliberately failed when total rows exceeded the display window.
- FIXED in canonical `src/lib/queries.ts` and compatibility `src/lib/queries-compat.ts`: removed the global count dependency while preserving the 500-row tenant-scoped range.
- FIXED in UI: the history heading now states the bounded recent-window semantics explicitly.
- Strengthened `scripts/check-import-query-bounds.mjs` to enforce the bounded range without requiring the misleading global count guard.
- No change to canonical import execution, DB commit, tenant authority, calculations, or importer architecture.
- NEXT: consume fresh exact-head gates on `f6d6...`; runtime/business persistence must re-pass before declaring the UI closure complete.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 58 FINAL — CERTIFIED UI CLOSURE, RUNTIME BLOCKER BOUND

- Exact code/test candidate: `cbfb7d0906e893ac32e274b571519d6f536ff8ad`.
- UI closure: Connections status summary and next action are now derived from the canonical connector states; hard-coded counts were removed and the Product WOW UI contract guards the derivation.
- EXACT-HEAD CI RESULT: on the candidate's governed main descendant `2b9d28c9a1a8fa12677c03f11b7ba94e2a3dbac7`, quality PASS, Execution Enforcement Contract PASS, Final Execution Batch PASS, Storage Tenant Isolation PASS, and Final Certification Gate PASS.
- No backend/RPC/runner/import lifecycle/tenant/calculation path changed in Wave 58.
- LIVE STAGING OBSERVATION remains unchanged from the current read-only check: `backup_verification_runs=0`; `import_processing=152`; `report_processing=1`; `report_dead_letter=7`; `watched_report_files=0`; `watched_report_folders=0`. These are observations, not certification.
- CURRENT RUNTIME BLOCKER: Vercel exact-head status remains `failure / build-rate-limit` and deployment context `pending` for current main `2b9d28c9...`; no current-head browser/live-runtime PASS is claimed.
- The existing full-product browser workflow requires real E2E secrets and exact-head deployment/runtime; those requirements were not bypassed.
- NEXT: obtain exact-head deployment/browser/runtime evidence through a real execution path; then execute the governed Phase-F backup/restore and remaining worker/server-boundary → tenant A/B → server OCR → watched-folder gates.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 58 — CONNECTIONS STATE-DRIVEN UI

- Exact current code/test head: `cbfb7d0906e893ac32e274b571519d6f536ff8ad`.
- `src/pages/ConnectionsPage.tsx` now derives proven, bounded, adapter counts and the next source action directly from the canonical connector state model; hard-coded status counts and the generic next label were removed.
- The visible summary now exposes the actual product state instead of static presentation values, while all existing canonical `/import` and `/trust` actions remain unchanged.
- `scripts/check-product-wow-ui-contract.mjs` now guards these dynamic summary invariants.
- No backend/RPC/runner/import lifecycle/tenant/calculation path changed.
- Current runtime boundary remains external; no old deployment/browser PASS is transferred to `cbfb...`.
- NEXT: fresh exact-head quality/enforcement/final-certification for `cbfb...`; then exact-head runtime/browser when hosting permits, followed by backup/RPO-RTO → worker/server-boundary → tenant A/B → server OCR → watched-folder → final certification.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 57 — CURRENT-SHA UI GUARD REPAIR

- Exact current code/test head: `c88abe725b066d8bbeb80de629be6198791d1523`.
- Closed the fresh certification failure in `scripts/check-product-wow-ui-contract.mjs`: the Work Center guard previously matched a stale literal `workerHealth?.expiredActive > 0`; the actual canonical code safely uses `(workerHealth?.expiredActive ?? 0) > 0`.
- The guard now asserts the real fail-closed implementation instead of accepting an obsolete syntax.
- No product route, RPC, runner, importer, tenant model, calculation, or runtime path changed.
- Prior exact-current-SHA result remains valid for the underlying Work Center/type fixes: the 20-stage release-readiness gate passed all 20 stages on `88323...`; the new `c88abe...` change is contract-test repair only.
- Certification/enforcement must be freshly consumed on `c88abe...`; no older certification evidence is transferred.
- Next: consume fresh quality, Execution Enforcement Contract, Final Certification Gate and Final Execution Batch for `c88abe...`; then continue backup/RPO-RTO → worker/server-boundary → tenant A/B → server OCR → watched-folder → final certification.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 56 — EXACT-HEAD TYPE/CERTIFICATION REBIND

- Exact code/test head: `88323d3fd8d5cc6cb8acca8e53894a11d72cb83e`.
- REAL CURRENT-SHA FAILURE FOUND: GitHub Actions `quality` on the preceding governance head `4be6a2be...` failed only in the 20-stage release-readiness typecheck because `CanonicalImportPage.tsx` lacked the existing `ErrorState` import and `WorkCenterPage.tsx` introduced two optional-state/type errors.
- FIXED: restored the canonical `ErrorState` import; guarded `workerHealth.expiredActive` with an explicit nullish fallback; and changed the Work Center Card fallback from invalid `default` to the existing canonical `standard` variant.
- EXACT CURRENT CI RESULT: on `88323d3fd8d5cc6cb8acca8e53894a11d72cb83e`, the `20-stage release readiness` gate completed **20/20 PASS**.
- INDEPENDENT CURRENT-SHA RESULTS: UI route completeness PASS; storage tenant isolation PASS; Final Execution Batch PASS.
- REAL CERTIFICATION FAILURE DIAGNOSIS: `Execution Enforcement Contract` and `Final Certification Gate` both stopped at the same existing certification-boundary guard because the indexed candidate remained `435534c9652...` while the current code/test candidate is `88323d3fd8...`.
- CORRECTION: this wave rebinds the existing governed certification index/reference to the exact code/test candidate instead of weakening or bypassing the boundary.
- NO ARCHITECTURE CHANGE: no new route, RPC, runner, importer, tenant model, calculation engine, or alternate certification path was introduced.
- DEPLOYMENT BOUNDARY: Vercel has a READY deployment for the prior governance SHA `918892...` only; no runtime PASS is transferred to `88323...`. Current exact-head runtime remains unproven.
- NEXT: consume the new certification/enforcement runs triggered by this governance rebind; then continue backup/RPO-RTO → worker/server-boundary → tenant A/B → server OCR → watched-folder → final certification.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 55 — WORK CENTER OPERATIONAL ACTIONABILITY

- Exact current code/test head before governance: `435534c9652ce30df9e55dc744d469782279c4fd`.
- `src/pages/WorkCenterPage.tsx` now derives one real next action from authoritative worker/queue state: expired leases → recheck, partial worker read → re-read, review pressure → review filter, failed operations → failure filter, active operations → active filter, empty/stable queue → canonical unified import.
- The action surface is in-place and preserves the existing canonical import/worker paths; no new route, RPC, runner, importer, tenant boundary, or deterministic calculation was added.
- Accessibility was improved with explicit `aria-pressed` filter state and `aria-live="polite"` for the derived next-action message.
- `scripts/check-product-wow-ui-contract.mjs` now guards the new operational/actionability/accessibility invariants.
- Exact source verification and compare from the prior governance head `b01ae295...` show only the intended Work Center/UI-contract files changed in this wave.
- Current-head deployment boundary remains fail-closed: Vercel reports `failure` / `build-rate-limit`, Deployments is `pending`, and no GitHub Actions workflow run is exposed for this SHA. No runtime/build/browser PASS is transferred.
- Next executable action remains fresh exact-head CI/build/Phase-F/browser certification, followed by backup/RPO-RTO → worker/server-boundary → tenant A/B → server OCR authority → watched-folder → final certification.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 54 — EXACT-SHA PHASE-F + LIVE SECURITY/DB CLOSURE

- Exact current code/test head before governance: `2c9b4756b43e2415fda8b37ea367d02c8570c22f`.
- Phase-F exact deployment binding: probe `97a52c0772089609ee3a5a5fb346839a3f8c6601`; runtime-closure guard `91536018fb02b8918874c28ecedfb8ef7d5e5df3`.
- The live Phase-F health probe now fails closed unless the runtime reports `deployment_sha === EXACT_HEAD` and a non-empty `deployment_id`; `api/health.mjs` already exposes both `VERCEL_GIT_COMMIT_SHA` and `VERCEL_DEPLOYMENT_ID`.
- Live staging security drift closure: the existing repo migration `20260830061000_close_public_rpc_advisor_gaps` was applied to `Report-Advisor-P0-2-Staging` (`fnqbvfuwbdpwvhcgzksl`), recorded live as migration version `20260921182639`. Result: `get_data_quality_snapshot()` is SECURITY INVOKER and `record_watched_report_file(...)` is no longer executable by `authenticated` or `anon`.
- Supabase security advisor after that closure reports 46 authenticated-executable SECURITY DEFINER findings plus one leaked-password-protection warning. No blanket revoke was performed; remaining functions require function-by-function authorization/tenant-boundary review.
- Live staging performance closure: six FK-covering indexes were added for `import_field_lineage` and `import_job_rows`; the migration was recorded live as version `20260921182858` with name `20260921183000_import_fk_performance_indexes`.
- Performance advisor now shows no `unindexed_foreign_keys` finding for this import lineage path; remaining `unused_index` findings are informational and were not removed blindly.
- Current staging operational observations: import jobs `completed=3066`, `failed=1249`, `processing=151`; report execution jobs `completed=3126`, `dead_letter=7`, `failed=10`, `queued=564`. These are live observations, not certification.
- Public-schema safety check: 103/103 tables reported RLS enabled on staging.
- No new route, RPC, import engine, runner, calculation path or tenant model was introduced by these closures; the Phase-F change is a test/probe contract and the DB changes use existing governed migrations.
- Exact-head Vercel status remains fail-closed: `failure` / `build-rate-limit`, deployment context `pending` for the current head.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 53 — DECISION TRUTH SEMANTICS

- Exact code/test candidate: `3ab9e99a41676b22a6b61fe35db7891c7f170eac`.
- Decision Experience implementation: `58f6dd971ce905a3ea5a1f8670101e92c75ddade` changes readiness semantics so `expected_impact = 0` remains a valid recorded value rather than being treated as missing.
- Executive Command Center implementation: `274f813567d111112d850a696035bf4aba604c28` changes the Money Recovery availability label to `بيانات الذمم متاحة`, avoiding an unsupported claim that money is recoverable solely because receivables data exists.
- UI contract guard: `3ab9e99a41676b22a6b61fe35db7891c7f170eac` protects both semantic invariants.
- No calculation, KPI, route, RPC or backend path was changed; this wave only corrects truth-state presentation of existing authoritative fields.
- Exact source verification confirms the zero-impact condition uses `== null` and the Money Recovery label does not overstate recoverability.
- Exact-head deployment remains fail-closed: Vercel `failure` / `build-rate-limit`, deployment context `pending`.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 52 — IMPORT HISTORY FAIL-CLOSED + LIVE DB POSTURE

- Exact code/test candidate: `d6aec3aa6285f852043c4b3b7b1bbb364305141b`.
- Canonical Import implementation: `25c681ad540bacab9b0567d78b74a331ea224849` updates `src/pages/CanonicalImportPage.tsx` after the actionable history-state change `e0978b867fbcd4a9a9f70b8d8f3515948dfaa590`.
- UI contract guard: `d6aec3aa6285f852043c4b3b7b1bbb364305141b`.
- Import history fetch failures no longer collapse into `history=[]`; they are preserved in `historyError` and rendered as an explicit retryable error state.
- An actually empty history remains a separate state and now exposes the existing `reset`/source-selection action `اختيار مصدر` without adding a second import workflow.
- Exact source verification confirms the three states: loading, history error, and authoritative empty/non-empty history.
- Live staging security posture checked on `Report-Advisor-P0-2-Staging` (`fnqbvfuwbdpwvhcgzksl`): 103 public tables reported by Supabase with RLS enabled on all 103; security advisor currently reports 60 authenticated-executable SECURITY DEFINER findings plus one leaked-password-protection warning.
- The core `import_*` functions and watched-report/Phase-L runtime helpers were inspected live; several are intentionally callable by authenticated tenant users and contain explicit tenant/role gates, so no blanket revoke was applied.
- Live staging counts: `import_jobs=4465`, `report_execution_jobs=3706`, `canonical_import_commits=3126`, `backup_verification_runs=0`, `watched_report_files=0`, `watched_report_folders=0`, `import_snapshots=0` on this project. These are environment observations, not certification.
- No route, RPC, runner, import engine, table, tenant/RLS path or deterministic calculation was introduced by this wave.
- Exact-head deployment remains fail-closed: Vercel `failure` / `build-rate-limit`; deployment context `pending`.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 51 — INVENTORY EMPTY-STATE GOVERNANCE

- Exact code/test candidate: `c90a97aad3c353f031c80cfd0788836b20add1e1`.
- Inventory UI implementation was added in `src/pages/EntityPages.tsx` across implementation commits `976adb2b54ba52af9cadae4b4deb0085bdc539e8` and corrective `3b7f6e35f69bb53fd56a1714922376d4322ccd1a`.
- UI contract guard: `c90a97aad3c353f031c80cfd0788836b20add1e1`.
- Inventory now distinguishes an authoritative empty source (`totalRows === 0`) from an authoritative filtered-empty result (`filter !== 'all' && filteredRows === 0`).
- Empty source routes to the existing unified `/import`; filtered-empty restores `all` in place without reload.
- The condition was deliberately narrowed after review so unknown/null counts are not misclassified as empty.
- No route, RPC, runner, import engine, table, tenant/RLS path or business calculation was introduced.
- Exact source verification confirms the state conditions, import action and filter reset action. Exact-head deployment remains fail-closed at the Vercel free-plan `build-rate-limit` boundary.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 50 — DASHBOARD ANALYTICAL EMPTY STATES

- Exact code/test candidate: `6ae2c1c5e41c85598d2b7a160b7fe681aa7e7e33`.
- Dashboard implementation: `42743647d0a94d5fca37dc2308e904fda5b2dc5f` updates `src/pages/DashboardPage.tsx`.
- UI contract guard: `6ae2c1c5e41c85598d2b7a160b7fe681aa7e7e33` strengthens `scripts/check-product-wow-ui-contract.mjs`.
- Dashboard trend/category/customer/product empty analytical panels now expose real next actions instead of passive `لا توجد بيانات` text.
- The action derives from the existing KPI truth state: insufficient truth routes to `/data-quality`, while a usable snapshot can route to `/analytics`.
- Fail-closed language remains explicit: no synthetic trends or fabricated category composition are introduced.
- Existing customer/product direct pages remain available; the new empty-state action adds a quality-remediation path rather than replacing them.
- No route, RPC, runner, import engine, table, tenant/RLS path or deterministic calculation was introduced.
- Exact-head status remains fail-closed: Vercel reports `failure` with `build-rate-limit`, and Vercel Deployments is `pending`; no runtime/browser/build PASS is claimed.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 49 — REPORT RETRY RESILIENCE

- Exact code/test candidate: `7301ae56b7c01723ebdcc78756fc8a1ea5ffe399`.
- Reports implementation: `e6478ad3d7569e1e9cea832dac2e6b02f731ed9f` updates `src/pages/ReportsPage.tsx`.
- UI contract guard: `7301ae56b7c01723ebdcc78756fc8a1ea5ffe399` strengthens `scripts/check-product-wow-ui-contract.mjs`.
- Purchases, Inventory, Receivables and Profitability report failures now retry through their existing data loaders in place instead of forcing `window.location.reload()`.
- The change preserves report context and existing canonical queries; no new route, RPC, runner, import engine, table, tenant/RLS path or business calculation was introduced.
- Exact source verification confirms `window.location.reload()` is absent from `ReportsPage.tsx` and the report retry contract is guarded.
- Exact-head status remains fail-closed: Vercel reports `failure` with `build-rate-limit`, and Vercel Deployments is `pending` for the candidate. No runtime/browser/build PASS is claimed.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 48B — DECISION SOURCE-INSPECTION ROUTE FIX

- Exact code/test candidate: `34b2038602f4899a78e6e183087cfe232c02faa8`.
- UI fix: `42ca66e327ce63fd5353de86d3f8753f12356b55` changes the Decision Experience alert action «فحص المصدر أولًا» from the command-center route to the canonical Trust & Evidence surface `/trust`.
- UI contract guard: `34b2038602f4899a78e6e183087cfe232c02faa8`.
- This is a routing correction only; no new route, RPC, runner, import engine, table, tenant/RLS path or business calculation was introduced.
- Exact source was re-read after the change. No runtime/build PASS is claimed for this SHA.
- Exact-head deployment remains blocked by the free-plan Vercel `build-rate-limit`; older READY deployments remain non-transferable.

## IMPLEMENTATION UPDATE — 2026-09-21 / WAVE 48 — DECISION SURFACE ACTIONABLE EMPTY STATES

- Exact code/test candidate: `19efa63103657e60c973ec2d4449d74e05e73025`.
- Decision Experience implementation: `f0f50d97b2e77e415b33d268234ae6d4d88883ae`; UI contract guard: `5e3f84e607744844a68d37db707ee252061cf832`.
- Executive Command Center implementation: `95614f98043a3f3d00f49f92e80693378c06f6`; UI contract guard: `19efa63103657e60c973ec2d4449d74e05e73025`.
- Decision Experience empty states now expose real next actions: trust review when there are no active alerts, unified import when recommendations are absent, and return to the decision signal context when a recommendation is not selected.
- Executive Command Center empty signal/recommendation/trend states now expose the existing canonical intelligence or data-quality routes instead of ending in passive text.
- The trend-empty state remains fail-closed: no synthetic trend data, no fabricated KPI, and no inferred business result.
- Exact source verification confirms the changed files and their contract assertions on current `main`.
- No route, RPC, runner, import engine, table, tenant/RLS path, or deterministic calculation was introduced.
- Fresh exact-head status for `19efa...` remains fail-closed: Vercel reports `failure` with `build-rate-limit`, Vercel Deployments is `pending`, and GitHub reports no workflow run attached to this main commit.
- Existing Vercel READY deployments for older SHAs remain historical exact-SHA evidence only and are not transferred.

## IMPLEMENTATION UPDATE — 2026-09-21 / WORK CENTER ACTIONABLE EMPTY STATES WAVE 47

- Exact code/test candidate: `4995f5eb3b520cc8109d1f7b3c3baa5aa1d60525`; UI implementation commit `9e7d8b4040aacce163c780bf5c4f353ee6f8b64f`; UI contract guard `4995f5eb3b520cc8109d1f7b3c3baa5aa1d60525`.
- Work Center now distinguishes a genuinely empty tenant queue from a filter producing zero matches.
- Empty tenant state now sends the user directly to the canonical unified `/import` entry; filtered-empty state restores the full queue in place without a reload.
- This completes the missing operational next-step behavior without exposing internal importer taxonomy or creating a parallel workflow.
- Exact source re-read confirms both actions and the contract guards. Compare from the prior release anchor `916ef274...` to `4995f5...` shows only the intended UI/contract changes plus the synchronized governance files.
- Current exact-head deployment proof remains open: Vercel reports failure/pending `build-rate-limit` for the newest main commit, and no GitHub Actions run is attached to the current SHA. The READY deployment for `43219c...` proves only that earlier exact SHA and is not transferred.
- No route, RPC, runner, table, import engine, tenant/RLS path or deterministic business calculation was added.

## IMPLEMENTATION UPDATE — 2026-09-21 / DATA QUALITY DECISION ACTION WAVE 46

- Exact code candidate: `c71742d8b70f61ed580791cabf415ad81fd6944a`; UI implementation commit: `43219c1bf39c5cffee5f203fabd1324d01699aab`; UI contract guard: `c71742d8b70f61ed580791cabf415ad81fd6944a`.
- Data Quality now derives a visible `NEXT ACTION` from the authoritative snapshot state: EMPTY → unified import, critical issues → Trust review, non-critical issues → quality review, clean snapshot → Analytics.
- The decision action is exposed in both the summary strip and a dedicated action panel; no synthetic score, issue, evidence, RPC, route, runner, tenant path, or calculation was added.
- Exact source re-read after both commits confirms the state-derived action, canonical destinations and contract guard are present.
- Current exact-head GitHub status for `c71742...` reports Vercel `failure` at the free-plan `build-rate-limit`; no workflow run is attached to this main commit and no build/browser PASS is claimed.
- The preceding `916ef274...` Vercel READY deployment is retained only as exact evidence for that older SHA and is not transferred to the new candidate.
- PC01 is currently offline; Netlify connector can identify the existing site but its deploy action only returns the required source/repo command because no repository execution environment is attached.

## IMPLEMENTATION UPDATE — 2026-09-21 / REPORT CENTER LIVE SNAPSHOT + PHASE-F EVIDENCE BOUNDARY

- Wave-45 code/merge anchor: `42c89ef31bc67a20c66fd7f22d8325ecb642a71f` (UI code commit `c6dd99d320f5fb751832cdb4f5b7e7661af22d8d`; UI contract guard `a0efc8caddd310dba4d7a0fe2b83dee14ca21669`). Subsequent commits are governance-only write-backs.
- Report Center is no longer a static catalog: it reads the existing canonical `fetchDashboardSnapshot(6)`, exposes live sales/receivables/inventory/invoice context, the snapshot truth state, As Of, aging-data state and a direct next action.
- The refresh action stays within the page and the surface explicitly avoids replacement values when the canonical snapshot is insufficient.
- Contract guard `check-product-wow-ui-contract.mjs` now protects the live snapshot, next-action, refresh and no-synthetic-data invariants.
- No route, RPC, runner, table, import engine, deterministic calculation, tenant/RLS path or product taxonomy was added.
- Staging backup evidence check at 2026-09-21 17:26 UTC: `backup_verification_runs=0`; PostgreSQL WAL archiving was active with `archived_count=3195`, `failed_count=21`, and `last_archived_time=2026-09-21 17:26:30 UTC`. This is archival-health evidence only and is **not** restore/RPO/RTO proof.
- The repository already contains the real logical backup/restore Phase-F path using `supabase db dump`, ephemeral restore, SHA-256 artifact evidence, row-count comparison, and explicit RPO/RTO thresholds; fresh exact-head execution remains the acceptance boundary.
- Exact-head CI/runtime/browser certification is not yet claimed for `42c89ef31bc67a20c66fd7f22d8325ecb642a71f`. PR #608 was merged after the exact source/contract verification and a successful public Netlify deploy-preview check on the PR head; the Phase-F workflow still requires `pull_request` or manual `workflow_dispatch`, and the connected browser-dispatch path is currently unavailable. Vercel remains externally blocked by the free-plan `build-rate-limit`.

## LATEST IMPLEMENTATION UPDATE — 2026-09-21 / TRUST & EVIDENCE ACTIONABILITY WAVE 40

- The canonical Trust & Evidence surface now refreshes its authoritative data-quality snapshot in place; full-page reload is no longer used for refresh/error retry.
- The surface now exposes record count, issue count and critical-issue pressure derived from the existing snapshot, with a context-aware next action: source ingestion for an empty tenant, data-quality remediation for issues, and evidence inspection when the snapshot is clean.
- Empty quality state is now an explicit actionable state with a real `/import` entry rather than an unexplained blank panel.
- A UI contract now guards the in-place refresh, empty-state actionability, critical-issue routing, and the exact valid JSX action-label expression.
- No new route, RPC, runner, calculation engine, tenant/RLS path, import engine, or synthetic evidence was introduced.
# Report Advisor — Master Product, Requirements & Open-Source Reference

> **AUTHORITATIVE SINGLE REFERENCE.** This is the permanent registry for the comprehensive product requirements, architecture guardrails, product inspiration, open-source projects, licenses, integration decisions, acceptance rules, implementation mapping, reliability rules, and release gates used while evolving Report Advisor.
>
> **Last reviewed:** 2026-09-21
>
> This file supersedes scattered requirement/inspiration notes as the operational reference. New requirements, sources and implementation decisions are appended here rather than creating competing master lists.

## 1. Mission

Report Advisor is a new product. It may learn from proven products and open-source projects, but it must not become a copy of any vendor.

The target is a unified, accurate, fast, flexible, predictive, advisory and financially safe Business Decision Operating System with deterministic business calculations, governed semantic metrics, evidence/lineage, multi-format document intelligence, operational/inventory/procurement intelligence, customer/supplier intelligence, financial/accounting intelligence, forecasting/backtesting, decision/what-if intelligence, ChatBI, report generation, proactive alerts, low-bandwidth UX, and a free-first/open-source-first architecture with no mandatory local AI installation or paid AI provider.


## 2A. AUTHORITATIVE PRODUCT CONSTITUTION — AGHBARI 2026-09-21

> **BINDING PRODUCT RULE.** This section is part of \`docs/MASTER_PRODUCT_REFERENCE.md\` itself. It is not a secondary UI note and must not be copied into a competing master document. When older UI structures, navigation maps, screen groupings or visual contracts conflict with this section, the older structure is **SUPERSEDED** for product design purposes. Historical files remain historical evidence only.

### Product identity

**الأغبري / Report-Advisor — Business Decision Operating System**

The product is not a generic dashboard, CRUD application, mini-ERP, pharmacy application, chatbot, or Bolt-style template. Its purpose is to turn business data and documents into:

\`Data → Truth → Evidence → Signal → Decision → Approval → Action → Outcome → Learning → Benchmark\`

The product experience must visibly connect business facts to business decisions while remaining fail-closed when evidence, history, cost basis, freshness, tenant scope, or confidence is insufficient.

### Mandatory top-level information architecture

The primary application navigation is fixed to these zones only:

1. **مركز القرار / Decision Center**
   - Business health, decision queue, exceptions, signals, opportunities, Money Recovery, Decision Coverage, Decision ROI, Business Replay, outcome follow-up.

2. **البيانات والتشغيل / Data Operations**
   - Work Center, import/upload, document intelligence, extraction, normalization, validation, reconciliation, data quality, schema drift, sources/connectors and operational jobs.

3. **التحليل التجاري / Business Analytics**
   - Sales, Purchases, Profitability, Receivables/Collections, Liquidity/Cash, Inventory, Demand/Movement, Customer/Supplier analysis, RFM, ABC/XYZ/FSN, Aging, concentration, anomalies and trend analysis.

4. **الذكاء والقرار / Intelligence & Decision**
   - Signals, drivers, early warnings, recommendations, forecasts, backtests, scenarios, AI advisory, Decision Experience and Decision Playbooks.

5. **الثقة والأدلة / Trust & Evidence**
   - Evidence Center, Evidence Passport, provenance, lineage, Metric Inspector, snapshots, confidence, decision evidence, benchmark governance and trust health.

6. **التقارير والمخرجات / Reports & Outputs**
   - Executive report, domain reports, Report Builder, review, export and print surfaces. Reports are decision outputs, not merely decorative views.

7. **البيانات المرجعية / Master Data**
   - Customers, Products, Suppliers, Warehouses, inventory entities, business keys, synonyms, units, packaging and semantic dictionary.

8. **الإعدادات / Settings**
   - Company, users, roles, permissions, profile, language, currency, sources/connectors, notifications, security, integrations and system health.

No additional top-level sidebar category may be introduced unless this master reference is deliberately amended with an explicit product decision.

### Aghbari Advisor — permanent intelligence layer

**المستشار الأغبري** is not a standalone navigation category. It is a persistent application layer available from every major screen through a fixed conversation drawer/panel.

It must understand current page context, active report/metric/entity/decision and available evidence. It may explain, investigate, compare, diagnose, summarize, forecast where minimum-data gates pass, build scenarios, draft recommendations and navigate the user to evidence/analysis/decision surfaces.

Every consequential answer must expose, where applicable:

- Source / Evidence
- Calculation or metric reference
- Period / As Of / Freshness
- Confidence / quality state
- Expected impact
- Recommended next step

The advisor may never manufacture authoritative business numbers, bypass validation, perform unapproved financial writes, or replace deterministic business calculations.

### Information-architecture rule

Do **not** promote individual metrics or analytical techniques into top-level navigation.

The following are lenses/features inside their parent domains, not sidebar categories:
- RFM
- ABC / XYZ / FSN
- Aging
- DSO / DIO / DPO / CCC
- Forecasts
- Margin
- Velocity / acceleration
- Metric Inspector
- Evidence Passport
- Provenance
- Confidence
- Scenario analysis

Likewise, the advisor is not a separate app.

### Canonical business journey

For any imported report, document or connected dataset, the user-visible journey should progressively reveal:

\`Source → Extraction → Normalization → Validation → Reconciliation → Canonical Truth → Semantic Metrics → Analysis → Evidence → Signal → Intelligence → Recommendation → Decision → Approval → Action → Outcome → Learning → Benchmark\`

The UI must never imply a later state before the authoritative backend state exists.

### Visual constitution

The visual system is fixed at product level:

- Arabic-first RTL enterprise SaaS.
- Aghbari dark ink/navigation foundation with teal/emerald and restrained warm-gold accents.
- High information density without visual noise.
- Strong hierarchy and progressive disclosure.
- One shared App Shell, Header, Sidebar, Page Header and design system.
- Shared typography, spacing, surfaces, controls, states, tables, charts, dialogs and responsive rules.
- KPI cards are evidence-aware and must expose data state when it matters.
- Charts use a consistent semantic palette and meaningful labels; no decorative color proliferation.
- Trust states are first-class: \`VERIFIED\`, \`TRUSTED\`, \`PARTIAL\`, \`REVIEW\`, \`BLOCKED\`, \`INSUFFICIENT DATA\`.
- Responsive, mobile-capable, PWA-friendly and low-bandwidth aware.
- Keyboard-first command access through the existing Command Palette.
- Accessibility, focus behavior, readable Arabic typography and reduced-motion behavior are required.
- No copied vendor UI, generic Bolt sections, legacy visual islands, contradictory brand systems or demo-only screens.

The approved BI reference image defines **composition, hierarchy, density and visual language** only. It is not a literal copy target.

### Dashboard / Decision Center visual contract

The home surface is a **Decision Center**, not a generic KPI wall. Its visual hierarchy should prioritize:

1. Business pulse / executive context.
2. Four or fewer critical business indicators where real evidence exists.
3. Business trend and drivers.
4. Distribution / concentration / exposure views where useful.
5. Decision summary: what needs attention, why, evidence, owner/next step.
6. High-value signals and exceptions.
7. Direct entry points to Work Center, Reports, Documents, Intelligence, Investigations and other decision workflows.

No fabricated metric, synthetic alert or placeholder chart may be presented as business truth.

### Document / import visual contract

The import experience must make the real processing lifecycle visible:

\`queued → fingerprinted → extracted → canonicalized → validated → analyzed → decisioned → committed → rendered\`

The interface must distinguish:
- pending/processing,
- review-required,
- blocked/rejected,
- committed,
- rendered,
- unavailable.

\`committed\` is only shown after the authoritative database commit path succeeds.

### MANDATORY UNIFIED IMPORT ENTRY — ONE CANONICAL INGESTION SURFACE

**قاعدة المنتج الملزمة:** الأغبري يملك مدخلًا واحدًا عامًا للمصادر والملفات والبيانات. هذه النقطة ليست «مستورد منتجات» أو «مستورد عملاء» أو «مستورد فواتير»، ولا تُبنى تجربة المستخدم على اختيار كيان أو جدول قبل قراءة المصدر.

المسار الكانوني هو:

`Any Source → Read → Understand → Extract Structure & Meaning → Quality & Confidence → Evidence → Review → Canonical Approval/Commit → Business Understanding`

يرفع المستخدم أي مصدر يدويًا أو عبر قناة مدعومة. النظام هو الذي يتولى اكتشاف الصيغة، الفحص الأمني، استخراج المحتوى، فهم البنية والحقول والعلاقات، رصد الجودة، بناء السياق الدلالي، وتحديد ما يمكن إثباته. لا يُطلب من المستخدم اختيار هوية المصدر مسبقًا، ولا تُفرض عليه قائمة كيانات ثابتة، ولا يظهر له تصنيف داخلي على أنه «محرك الاستيراد».

قد يستخدم القلب الداخلي إشارات أو تصنيفات دلالية مساعدة لفهم المصدر وتحسين التحليل، لكن هذه الآليات تبقى **تفاصيل تنفيذية داخلية**. لا يجوز أن تتحول إلى taxonomy للمنتج، أو قوائم اختيار، أو routes/RPCs/importers منفصلة، أو لغة تجبر المستخدم على التفكير في جداول قاعدة البيانات.

التجربة العامة يجب أن تُظهر للمستخدم قيمة الفهم نفسه: ما الذي قُرئ، ما الذي فُهم، ما مستوى الجودة والثقة، ما الذي يحتاج مراجعة، وما الذي أصبح موثقًا وقابلًا للاستخدام. عندما يكون المعنى غير محسوم، لا يُخمن النظام ولا يرفض المصدر لمجرد أنه جديد؛ يحتفظ به ضمن العقد العام، ويُظهر حدود الفهم ويطلب المراجعة فقط عندما تكون المراجعة لازمة للثقة.

إذا احتاج النظام بعد ذلك إلى تحليل تشغيلي متخصص، فذلك يحدث **بعد فهم المصدر** داخل طبقات Business Analytics / Intelligence / Decision، وليس عبر تحويل صفحة الاستيراد إلى كتالوج مستوردات متخصصة.

لا يجوز لأي تطوير لاحق أن يعيد إدخال اختيار target entity أو table picker إلى المدخل الموحد، ولا إنشاء مسار استيراد مستقل لمجرد اختلاف طبيعة البيانات. أي توسعة يجب أن تزيد قدرة الأغبري على فهم المصادر المختلفة عبر نفس المسار العام، مع الحفاظ على الحقيقة الكانونية، الدليل، الـprovenance، الـtenant/RLS، والـfail-closed behavior.

**النتيجة التصميمية الملزمة:** المستخدم يفكر «لدي مصدر أريد أن يفهمه الأغبري»، ولا يفكر «أي جدول يجب أن أستورد إليه؟». هذه قاعدة منتج أساسية وليست تحسينًا اختياريًا للواجهة.

### PRODUCT DECISION — DOMAIN-NEUTRAL INGESTION
The unified ingestion surface is intentionally **general-purpose and source-first**. The user never starts by selecting a fixed target entity or table-specific importer. The system reads the source first, extracts structure and content, understands semantic meaning and confidence, and preserves that context without exposing internal taxonomy as the product experience.

The product identity must remain broader than any single business record type. Fixed implementation targets may exist only as internal compatibility details; they must never define the import UX, product taxonomy, customer-facing language, or canonical product position.

The correct mental model is:
`Any Source → Read → Understand → Semantic Context → Quality → Evidence → Review → General Canonical Contract → Business Understanding`

The general canonical contract now exists on the existing `import_commit_batch` path. Source-neutral rows are persisted in `canonical_dataset_records`, protected by tenant RLS and provenance/source-hash checks, while legacy specialized implementation branches remain internal compatibility only. The unified import UX must not expose those legacy entity names or require the user to select a target.

### Truth and finance rules visible in UI

- Deterministic calculations are authoritative.
- AI is assistive for explanation, synthesis and recommendation wording.
- Profitability is explicitly unavailable when no verified cost basis exists.
- Forecasts are explicitly unavailable when minimum-data gates fail.
- Benchmarks show \`INSUFFICIENT SAMPLE\` when sampling requirements are not met.
- Stale or unknown data cannot silently drive executive warnings or decisions.
- Tenant scope, period, As Of, freshness and evidence remain traceable from important outputs.

### Cleanup / consolidation law

The product must continuously converge toward one coherent system.

For every legacy or duplicate surface, classify it as:
- **KEEP** — required and canonical.
- **IMPROVE** — required but visually/architecturally weak.
- **REPLACE** — capability needed but implementation contradicts the canonical product path.
- **REMOVE** — proven orphan, duplicate, dead, obsolete, mock, legacy-branded or conflicting surface.

Before deletion, inspect references/dependencies and preserve any required capability by consolidating into the canonical path. Do not create another wrapper, runner, RPC, navigation map or competing design system to avoid doing the consolidation.


### MANDATORY PRODUCT-DESIGN INITIATIVE — VALUE-FIRST UI EVOLUTION

الواجهات لا تُعامل كمخرجات جامدة للمواصفة. في كل شاشة وتدفق، يجب أن يعمل المبرمج بعقلية **Product Designer + UI/UX Engineer** وأن يبحث استباقيًا عن فرصة حقيقية لتحسين الفهم، القرار، العمل، الثقة، أو القيمة المدركة.

بعد أي تنفيذ واجهي، يجب إجراء مراجعة **«ما الذي يمكن تحسينه هنا؟»** وتنفيذ التحسين المناسب مباشرة ضمن الهوية والبنية المعتمدتين، سواء كان ذلك Action أو زرًا، بطاقة أو مؤشرًا، تحسين عرض البيانات، Drawer/Panel/Modal، فلترًا أو بحثًا، تنبيهًا أو حالة، Tooltip، مقارنة/Visualization/Timeline/Evidence View، حالة Empty/Loading/Success/Warning/Blocked/Review/Insufficient Data، Micro-interaction، Shortcut، أو تحسينًا في الترتيب والتسلسل البصري وطريقة عرض النتيجة أو التوصية أو القرار.

هذه المبادرة **مقيدة بالقيمة وليست تفويضًا للزحام أو اختراع وظائف**: يُنفذ العنصر فقط إذا أضاف قيمة واضحة مثل فهم أسرع، قرار أسرع، عمل أسرع، دليل أوضح، اكتشاف فرصة/مشكلة، خطوات أقل، ثقة أعلى، أو قيمة مدركة أعلى. ويجب أن يبقى متسقًا مع الـIA، الهوية البصرية، المسارات الحقيقية، حالات الثقة، deterministic calculations، fail-closed، tenant/RLS، والأداء والاستجابة. لا يجوز أن تتحول المبادرة إلى taxonomy جديدة أو backend path جديد لمجرد خدمة الواجهة.

### MANDATORY PROGRESSIVE DISCLOSURE — BUSINESS-FIRST NAVIGATION

قوة المنتج لا تُقاس بعدد العناصر الظاهرة في الـSidebar. **الواجهة الأساسية يجب أن تبقى موجهة لرجل الأعمال، لا لكتالوج قدرات تقني.**

قاعدة العرض:
- تبقى المناطق الثمانية ثابتة وواضحة.
- تظهر في المستوى الأول الوظائف الأكثر استخدامًا واتخاذًا للقرار فقط.
- القدرات المتقدمة التي يمكن أن تشتت المستخدم تُكتشف داخل الـHub أو عبر فتح القسم، ويمكن إظهارها في الـSidebar فقط عند وضع **Advanced/Expert**.
- لا تتحول كل KPI أو تقنية تحليل أو طبقة ثقة إلى عنصر Navigation مستقل لمجرد أنها موجودة في المنتج.
- يجب أن تكشف الواجهة العمق تدريجيًا: **Overview → Hub → Advanced Surface → Evidence/Detail**.
- كل سطح جديد يجب أن يكون مكتمل القيمة وقابلًا للوصول، لكن دون التضحية بالوضوح أو التسلسل البصري.

الهدف: **إظهار قوة العمل المتراكم عبر الشهور دون إغراق رجل الأعمال في التفاصيل من أول نظرة.**

### Visual-first execution priority

For the next major product-development wave, the first priority is **complete visual coverage of the entire canonical product surface** using the shared design system and real application paths.

The programmer must first bring all canonical screens into one coherent Aghbari product experience, then deepen truth/runtime/certification work in parallel where independent, without weakening any fail-closed rule.

The target is not “more pages”. The target is a visibly complete, commercially credible product whose:
- shell is coherent,
- navigation is canonical,
- every major surface looks native to Aghbari,
- real data paths remain authoritative,
- empty/loading/error/review states are deliberate,
- and the transition from data to evidence to decision is visible.

### Supersession statement

The following are explicitly **not** the product identity and must not be restored as the main information architecture:
- generic Commerce / ERP CRUD groupings,
- arbitrary Bolt-style dashboard sections,
- duplicate sidebar taxonomies,
- one-page-per-KPI navigation,
- a standalone chatbot product identity,
- visual mockups that bypass real application state,
- duplicate "Intelligence" or "Evidence" navigation trees,
- sector-specific framing that narrows the platform into a single industry.

This constitution supersedes conflicting UI/navigation proposals while preserving valid underlying technical capabilities.

## 2B. CANONICAL AGHBARI PRODUCT TREE — UI / UX / SURFACE CONTRACT

This is the target product tree. It defines how capabilities are presented; it does not authorize new backend paths merely to satisfy a visual tree.

الأغبري
├─ Global App Shell
│  ├─ RTL workspace
│  ├─ Header / company / period / As Of / freshness / trust
│  ├─ Command Palette
│  ├─ Notifications / account
│  ├─ Persistent Aghbari Advisor drawer
│  └─ Responsive / PWA / low-bandwidth behavior
├─ 01 مركز القرار
│  ├─ نبض الأعمال
│  ├─ Decision Queue
│  ├─ Signals & Exceptions
│  ├─ Opportunities / Money Recovery
│  ├─ Decision Coverage
│  ├─ Decision ROI
│  ├─ Business Replay
│  └─ Outcome follow-up
├─ 02 البيانات والتشغيل
│  ├─ Work Center
│  ├─ Import / Upload
│  ├─ Document Intelligence
│  ├─ Extraction / OCR
│  ├─ Validation / Review
│  ├─ Reconciliation / Deduplication
│  ├─ Data Quality
│  ├─ Sources / Connectors
│  ├─ Watched Reports / Folder processing
│  └─ Operational jobs
├─ 03 التحليل التجاري
│  ├─ Analytics Home
│  ├─ Sales
│  ├─ Purchases
