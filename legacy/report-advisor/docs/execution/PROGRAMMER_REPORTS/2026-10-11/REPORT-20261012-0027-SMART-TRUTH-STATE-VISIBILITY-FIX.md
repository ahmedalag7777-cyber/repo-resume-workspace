# EXECUTION CHECKPOINT — 2026-10-12 00:27 +03 / SMART REPORT TRUTH-STATE VISIBILITY FIX

REPORT_FOR_HEAD = bdfb7d3e4f5db3894d5b441e64c62ebefc708217
UPDATED_AT = 2026-10-12T00:27:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
BRANCH = fix/source-bound-generic-intelligence-20261009
PR #912 = https://github.com/Report-Engainall/Report-Advisor/pull/912 (OPEN / NOT MERGED)
MAIN_BASE = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO
DO_NOT_MERGE = true

## Live state and first confirmed failure

The verified predecessor at the start of this change was `ef0c3d1c426fb182dc6aa382f18c9d47cc57746b`. PR #912 has since advanced to the code/test commit `bdfb7d3e4f5db3894d5b441e64c62ebefc708217` linked above. The prior pointer supplied at initial resume (`9bd1902902a01422590123a0d13f2a78e5658e35`) is historical, not the current head.

Full Product Browser E2E run [38175717130](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717130) failed on exact predecessor `ef0c3d1c426fb182dc6aa382f18c9d47cc57746b`, artifact [11715802981](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717130/artifacts/11715802981). The actual error from `artifacts/e2e-business/result.json` was:

`Smart Report truth-state section must be visible`

The failing journey had already passed authenticated login/route checks, fresh generic CSV upload, 3/3 valid rows and 0 invalid rows, canonical persistence and history readback, report job/source-hash binding, non-empty generic signals and recommendations, and the canonical pending-evidence label assertion. The previous 254-row saved PDF report also retained its stable reportJobId/sourceHash across the tested screens and refresh. This does not make the browser journey a PASS: its result was FAIL and the fail-closed guard correctly enforced that result.

## Root cause

The heading `ما الذي ثبت وما الذي لم يُثبت` and its decision-state cards were rendered inside the `<details>` disclosure headed `EVIDENCE PASSPORT · المصدر · الإثبات · التفاصيل`. That disclosure is collapsed by default, so the truth-state section did not exist in the visible first-paint body text asserted by the authenticated fresh-upload journey. This is a real product information-visibility issue; relaxing the E2E assertion would conceal the defect.

## Change committed and verified by GitHub readback

Commit [bdfb7d3e4f5db3894d5b441e64c62ebefc708217](https://github.com/Report-Engainall/Report-Advisor/commit/bdfb7d3e4f5db3894d5b441e64c62ebefc708217) moves the existing truth-state/decision section out of the collapsed EVIDENCE PASSPORT disclosure and places it immediately before the disclosure, after the executive summary. The content and truthful state values are unchanged; detailed evidence remains available in its progressive disclosure.

The same commit updates `scripts/report-smart-evidence-boundary.test.ts` to assert that the truth-state heading appears in source before the EVIDENCE PASSPORT disclosure. GitHub readback verified:
- truth-state heading exists exactly once and precedes the disclosure marker (`84092 < 84859` in the persisted source content);
- the static regression assertion is persisted;
- only `src/pages/SmartReportPage.tsx` and `scripts/report-smart-evidence-boundary.test.ts` changed in this code commit.
No authentication bypass, tenant/RLS change, evidence promotion, or weakening of the fail-closed browser assertion was made.

## Related exact-predecessor CI evidence (not transferable to this commit)

On predecessor `ef0c3d1...`:
- Session Handoff Contract PASS [38175717044](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717044).
- Phase-F Live Resilience PASS [38175717208](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717208).
- Product Build Gate PASS [38175717219](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717219).
- Quality PASS [38175717148](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717148).
- Data Quality Runtime PASS [38175717166](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717166).
- Phase 2 Security Closure PASS [38175717132](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717132).
- Final Certification Gate PASS [38175717185](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717185).
- Device-Independent Browser E2E PASS [38175717235](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38175717235).

Those results validate only the predecessor. Exact-head results after `bdfb7d3e4f5db3894d5b441e64c62ebefc708217` must be read before claiming the fix is proven in the full authenticated journey. Earlier in this session, Session Handoff had failed on `9bd1902...` because `.github/workflows/phase-f-live-resilience.yml` was not reported; the workflow actually changed its runtime-provenance allowlist to classify that workflow path and report archives as non-runtime provenance while keeping other code/API/build paths fail-closed. Session Handoff subsequently passed on `ef0c3d1...` (run 38175717044). The contract was not deleted or weakened here.

## Still unproven

- Exact-head build, quality, Session Handoff, security, Phase-F, and full authenticated browser results for `bdfb7d3e4f5db3894d5b441e64c62ebefc708217`.
- Successful fresh-upload → Smart Report visible truth state → persisted readback → same reportJobId/sourceHash after refresh/navigation/re-entry, on one exact code/test head.
- Full-source diverse-file product proof and production deployment identity/runtime proof.
- Production currently has not been proven to contain this fix.

## NEXT EXACT ACTION

Refresh GitHub Actions for `bdfb7d3e4f5db3894d5b441e64c62ebefc708217`; inspect Full Product Browser E2E first and its `result.json`/screenshot. Fix only the next proven failure. Keep PR #912 open and `PRODUCT_COMPLETE = NO` until the complete authenticated source-bound journey and production proof pass.
