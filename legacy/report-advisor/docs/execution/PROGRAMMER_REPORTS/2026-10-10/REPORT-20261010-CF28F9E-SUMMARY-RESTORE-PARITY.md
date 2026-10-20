## ARCHIVED EXECUTION REPORT — 2026-10-10T19:10:00+03:00 — visible executive summary + metric restore schema parity

SESSION HANDOFF = READY
REPORT_FOR_HEAD = cf28f9e24e04c69f1ae068b1053768c4dc32179a
UPDATED_AT = 2026-10-10T19:10:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
APPLICATION_CODE_HEAD = cf28f9e24e04c69f1ae068b1053768c4dc32179a
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO

WHAT_I_WAS_ASKED_TO_DO =
Continue the existing Report-Advisor project and deliver executed fixes, not status-only commentary: keep universal file analysis, restore persisted metric schema, expose the Smart Report's executive summary, and prove the result through exact-head browser/build/restore gates.

WHAT_I_ACTUALLY_DID =
- Applied the source-proof-gated legacy import reconciliation on staging, with audit evidence stored under `import_jobs.result_summary.legacyRowCountReconciliation`. It only repaired records whose source hash/file security/rendered row count/analyzed row count/canonical commit count/canonical row count matched exactly. Readback established 49 corrected import jobs, 49 passports VERIFIED/READY/FULL, and zero unresolved within that repaired set.
- Applied tracked restore-schema migrations for `intelligence_voi_requests` and `report_cell_lineage` after inspecting their live schema and tenant protections.
- Applied `restore_report_intelligence_calculations_schema_parity` at staging migration version `20261010155211`. Readback verifies the relation exists with RLS enabled and 3 tenant-scoped policies. The table has 77 persisted metrics across 2 report jobs (33 CALCULATED and 44 NOT_AVAILABLE), so “unavailable” values remain explicit rather than fabricated.
- Fixed a real UI bug in `src/pages/SmartReportPage.tsx`: the executive-summary section was nested inside the collapsed Evidence Passport `<details>`, hiding it from normal users by default. It now renders before that disclosure with `data-testid="smart-report-executive-summary"`.
- Updated `scripts/real-business-e2e.mjs` to wait for and inspect the visible executive-summary element, rather than treating collapsed content as visible. Updated `scripts/smart-report-complete-intelligence-surface.test.mjs` and `scripts/check-migration-schema-audit.mjs` with regressions for visible summary order and metric-table restore/security parity.

WHAT_IS_PROVEN =
- Staging readback: 49 source-proof-based imports reconciled; associated 49 passports are VERIFIED/READY/FULL; 0 unresolved in that repaired set.
- Staging migration ledger contains `20261010155211 restore_report_intelligence_calculations_schema_parity`; the relation is RLS-enabled, has 3 tenant policies, and retains 77 calculation rows.
- Current code candidate `cf28f9e24e04c69f1ae068b1053768c4dc32179a` is committed/read back in GitHub. Source assertions prove the executive-summary marker now precedes the collapsed Evidence Passport disclosure; the E2E assertion targets that visible marker.
- Report Value Cohort [38065456403](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38065456403) completed SUCCESS on `cf28f9e24e04c69f1ae068b1053768c4dc32179a`; the previous exact-head cohort run [38064799780](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38064799780) proved 40/40 selected reports close as VERIFIED/READY/FULL across 4 tenants.
- Product Build, Quality, Phase-F, device-independent browser, full business browser, and handoff results for `cf28f9e24e04c69f1ae068b1053768c4dc32179a` are still pending/in progress at this checkpoint. No PASS is claimed for these current runs.
- Previous Phase-F run [38064799827](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38064799827) passed 3/4 probes and failed the backup restore on missing `report_intelligence_calculations`; this exact relation now has a tracked migration. The current Phase-F run must pass before restore is considered closed.
- Previous Full Product Browser [38064796601](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38064796601) failed with `Smart Report executive summary missing`; DOM inspection shows the executive summary was inside collapsed details. The UI and E2E now target the visible summary, awaiting exact-head rerun.

FIRST_ACTIVE_FAILURE =
Exact-head validation remains open. The main known unclosed proofs are: current browser run after moving the summary, current Phase-F logical restore after adding metric table parity, and current Quality/Product Build + Session Handoff results.

ROOT_CAUSE =
Two concrete defects were found: a missing checked-in schema parity migration for an existing persisted metrics table; and an executive summary mounted only inside a collapsed Evidence Passport disclosure, so the key management-level summary was not visible during a normal Smart Report view. Separately, a staging restore can reveal one missing relation at a time; each must be reconstructed from the observed live schema and secured, not waived.

NEXT_EXACT_ACTION =
Consume exact-head Quality, Product Build, Phase-F, Full Product Browser, Device-Independent Browser, Report Value Cohort and Session Handoff results. Fix the first confirmed failure while keeping source/evidence gates fail-closed; prove Smart Report summary visible on load and after refresh and prove the clean logical restore reaches completion. Keep PR #912 open until these proofs pass.

---

