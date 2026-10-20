## ARCHIVED EXECUTION REPORT — 2026-10-10T17:30:00+03:00 — shared specialty inference and browser trust-state proof repair

SESSION HANDOFF = READY
REPORT_FOR_HEAD = eb95f709a8ebead63e556380e18394c02c17726
UPDATED_AT = 2026-10-10T17:30:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
APPLICATION_CODE_HEAD = eb95f709a8ebead63e556380e18394c02c17726
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO

WHAT_I_WAS_ASKED_TO_DO = Resume existing PR #912, keep the completed intelligence core, make general analysis common to all uploaded files, expose complete source-bound results across File Lab and Smart Report, and prove actual report persistence/browser behavior.

WHAT_I_ACTUALLY_DID =
- Added `src/lib/file-engine/specialty-inference.ts` with a shared Unicode/NFKC header normalizer and header-evidence-based specialty inference.
- Replaced the duplicate and malformed File Lab normalizers in both preview and memoized specialty inference; repository readback on `8f064944...` showed no remaining `inferSpecialty` references in `ExternalFileAnalysisPage.tsx`.
- Added generic analysis regressions for spaced `Current Stock`, `Sales Qty`, `الرصيد المستحق`, `المدفوع`, explicit customer/supplier identity, and a generic `name,status,total` table that must not acquire a fabricated specialty.
- Read exact-head quality and product build logs for `8f064944...`: both passed. Generic analysis emitted `GENERIC FILE ANALYSIS PASS`; structured XLSX portfolio emitted `rows=3 columns=17 mapped=17 status/trend/reconciliation`. Device-independent browser test passed.
- Inspected Full Product Browser E2E logs. All 32 route checks passed and the certified Smart Report matched source path/hash, report job ID, and 332 source/canonical/committed rows. Its evidence state correctly remained `AWAITING_EVIDENCE_SNAPSHOT`. The browser failed only because its Arabic source-trust assertion omitted the UI’s actual text `موثوق`.
- Fixed `scripts/real-business-e2e.mjs` on current candidate `eb95f709a8ebead63e556380e18394c02c17726` so the browser accepts the displayed trusted-source label and separately requires visible evidence-review/pending status when no evidence snapshot is verified. This fixes the assertion, not the evidence gate.

WHAT_IS_PROVEN =
- Exact predecessor-head `8f064944f5f3b42c25ce1d3e687426abafd4b080`: Quality [38058146785](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38058146785) PASS; Product Build Gate [38058146826](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38058146826) PASS; Device-Independent Browser E2E [38058146520](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38058146520) PASS.
- Generic file-analysis run log explicitly confirms `GENERIC FILE ANALYSIS PASS` plus structured XLSX row/column/status/trend/reconciliation proof.
- The Full Product Browser E2E log exposed the actual trust assertion error; persisted current report ID `16709d80-e012-40ef-9c12-6fd8255897f8`, source `تقارير ادارية.xlsx`, SHA `sha256:587f2d3dbdc7ec1ccc8c988ccad72f84b6cf2b794fcbce6711ffe5ecf9d6b313`, 332 rows, quality score 98, and evidence state `AWAITING_EVIDENCE_SNAPSHOT`.
- Current candidate `eb95f709a8ebead63e556380e18394c02c17726` is committed and read back. Exact-head CI results have not yet become terminal at report creation. No claim is made that the new browser assertion passes.
- Value Cohort [38058146878](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38058146878) FAIL: only 18/42 passports verified; 24 remain unclosed/unverified.
- Phase-F live resilience [38058146545](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38058146545) FAIL: backup restore reports missing `public.intelligence_voi_requests`; 3/4 probes pass.
- Prior Session Handoff Contract [38058146969](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38058146969) FAIL due to missing file coverage in this report; this report and current state are now refreshed, with an append-only archive entry.

FIRST_ACTIVE_FAILURE = Current candidate CI not yet terminal. The last fully observed user-flow failure was an incorrect browser assertion that did not recognize `موثوق`; the same run proved all route checks and matching report/source lineage but did not prove the complete user flow.

ROOT_CAUSE = Two distinct states were conflated in the E2E assertion: source trust (`موثوق`) and evidence-passport verification (`AWAITING_EVIDENCE_SNAPSHOT`). The Smart Report correctly did not promote an unverified snapshot. Separately, the File Lab had an invalid whitespace-regex normalizer; the shared helper and source-header behavioral test now address that defect. Remaining product blockers are unclosed passports and restore schema parity.

NEXT_EXACT_ACTION = Consume terminal exact-head Quality/Product Build Gate/Full Product Browser E2E for `eb95f709a8ebead63e556380e18394c02c17726`. Fix the first verified failure without faking evidence status; then investigate why 24/42 evidence passports do not close and repair the restore schema relation. Keep PR #912 open until same `reportJobId + sourceHash` is proved through upload, full result display, navigation/reload and persisted readback.

---

