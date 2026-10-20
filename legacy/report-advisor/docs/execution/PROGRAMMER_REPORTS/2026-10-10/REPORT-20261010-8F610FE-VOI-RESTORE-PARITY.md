## ARCHIVED EXECUTION REPORT — 2026-10-10T17:45:00+03:00 — VOI restore schema parity and generic specialty header fix

SESSION HANDOFF = READY
REPORT_FOR_HEAD = 8f610fef2a966b4ae179ba26f1dbfd2fdfdb2c4e
UPDATED_AT = 2026-10-10T17:45:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
APPLICATION_CODE_HEAD = 8f610fef2a966b4ae179ba26f1dbfd2fdfdb2c4e
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO

WHAT_I_WAS_ASKED_TO_DO =
Resume the existing PR without rebuilding the intelligence core; make generic intelligence available for every readable file; preserve specialty analysis, full evidence lists, source lineage, and durable UI integration; fix verified blockers only.

WHAT_I_ACTUALLY_DID =
- Added shared specialty inference `src/lib/file-engine/specialty-inference.ts`, wired both File Lab specialty call sites to it, and added tests for spaced Arabic/English headers plus generic-header no-specialty behavior.
- Read actual browser failure on the predecessor: source trust rendered as `موثوق`, while E2E expected a different Arabic string. E2E now checks trusted source and pending evidence-snapshot/review state separately; exact-head rerun has not yet gone terminal.
- Queried staging schema read-only. `public.intelligence_voi_requests` exists there with id/company/report job/source hash/question/decision key/sensitivity/estimated value/priority/minimum evidence/state/provenance/created_at; FKs and checks; `idx_voi_requests_priority`; RLS and `voi_requests_tenant` policy; authenticated/service-role CRUD.
- The repository migration tree had no tracked migration creating `intelligence_voi_requests`; Phase-F restore failed because the restored schema did not have this relation.
- Added `supabase/migrations/20261010180000_restore_intelligence_voi_requests_schema_parity.sql` to track the missing schema in clean restores, plus a migration-audit regression in `scripts/check-migration-schema-audit.mjs` to check table/index/RLS/tenant policy/grants/guards.
- Did not apply DDL to the live staging database.

WHAT_IS_PROVEN =
- Same-branch GitHub readback proves the shared header helper and tests are committed.
- Prior Quality and Product Build Gate passed at predecessor `8f064944...`; generic file matrix logged `GENERIC FILE ANALYSIS PASS` and structured XLSX proof `rows=3 columns=17 mapped=17`.
- Exact Full Product Browser E2E predecessor exposed the actual UI assertion mismatch while confirming source hash/path/job and 332 canonical rows. It was not a full-flow PASS.
- Current code candidate `8f610fef2a966b4ae179ba26f1dbfd2fdfdb2c4e` and VOI migration/audit changes are committed/read back. The exact-head workflows listed in the resume section are pending/queued. No current-head pass is asserted.
- A previous Quality workflow run on an adjacent docs merge failed during setup/build due to missing `node_modules/vite/bin/vite.js`; the missing `dist/index.html` occurred afterwards. This does not prove a behavior failure, nor a successful build.
- Historical Report Value Cohort remains 18/42 verified; 24 passports remain not closed. Historical Phase-F restore failed on the missing VOI relation before this migration was added.

FIRST_ACTIVE_FAILURE =
New-candidate CI is not terminal. The historical restore failure now has a tracked schema-parity fix candidate, but it has not yet been verified by backup/restore workflow.

ROOT_CAUSE =
The intelligence core is present; current gaps are integration/verification rather than a missing core rewrite. Confirmed causes were: malformed File Lab header normalizer; an E2E assertion conflating source trust and final evidence-passport verification; and a restore schema relation that existed in staging but was absent from tracked migrations. The cohort failure is a separate genuine evidence-closure issue, not something to paper over.

NEXT_EXACT_ACTION =
Consume terminal Quality, Product Build Gate, Full Product Browser E2E, Session Handoff, and Phase-F results for `8f610fef2a966b4ae179ba26f1dbfd2fdfdb2c4e`. Fix the first proven issue while preserving fail-closed evidence states. Then prove one real report’s `reportJobId + sourceHash` through upload/render/navigation/reload/readback, and separately close the 40-report passport cohort.

---

