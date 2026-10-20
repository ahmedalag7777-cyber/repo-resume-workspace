# Execution Report — 11 October 2026 — Generic Intelligence UI and Report-Row Search Retest

**Repository:** `Report-Engainall/Report-Advisor`  
**Branch:** `fix/source-bound-generic-intelligence-20261009`  
**Pull request:** [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED  
**Exact code/test HEAD covered:** [`a644ab51e06b37f75bb498851d36e970ed993144`](https://github.com/Report-Engainall/Report-Advisor/commit/a644ab51e06b37f75bb498851d36e970ed993144)  
**Main base:** `fa1ab4cbade9b01685507aa966c10f700a03f576`  
**Updated:** `2026-10-11T18:16:00+03:00`  
**Product completion:** `PRODUCT_COMPLETE = NO` — browser upload-to-save/readback proof is still required.

## What was changed in this launch

1. Inspected the live branch and report-card rendering contract. The existing general intelligence layer and its composition with specialty analysis were preserved.
2. Fixed `src/components/ui/Card.tsx` to forward standard DOM attributes (including `data-testid` and `aria-label`) to the rendered `section`. This makes the existing general-intelligence card addressable by the browser and accessibility tests; it does not change the intelligence calculations.
3. Tightened the server-side RPC grant migration so `get_report_value_cohort_candidates(integer, uuid)` is executable by `service_role` only; `PUBLIC`, `anon`, and `authenticated` are explicitly revoked.
4. Expanded authenticated browser proof to upload a new, uniquely marked three-row Arabic CSV, validate canonical row count/tenant/source provenance, and check that general signals/recommendations and source lineage survive saved-report readback and refresh. Test-upload metadata explicitly marks it synthetic so it cannot pollute the real-source cohort.
5. Fixed the report-center test's stale Arabic placeholder expectation. The UI already says `ابحث داخل الصفوف: اسم صنف، عميل، رقم، قيمة...`; the previous test incorrectly searched for `بحث داخل الصفوف...`. The revised test fills a source-derived unique value, verifies filtering against its canonical row number, and clears the filter. The canonical readback now selects the `data` column needed to ground that proof.

## What is proven

- On this exact code/test HEAD, the Phase 2 security-definer closure passed: [run 38150429372](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38150429372).
- Report Value Cohort passed: [run 38150429603](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38150429603).
- Evidence Passport Live Proof passed: [run 38150429601](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38150429601).
- The latest deploy-preview status reported success: [Netlify preview](https://deploy-preview-912--aghbari-report-advisor.netlify.app). Vercel was still pending at the time of this checkpoint.
- Earlier authenticated browser evidence on predecessor `6bdb4c2` proved the existing report `8dbafdf8-f769-4c4f-97a5-22eac8b47d41` is stored with source `تقارير ارصدة المخزون.pdf`, hash `sha256:3e945a181e766f2e2a50ea765a2db40d57a5c6049481b8e208be10a59d328839`, 254 canonical rows, 9 completed tasks, quality 98, and trust `TRUSTED`. These are predecessor-head findings, not new-upload proof.
- Existing general intelligence/source lineage was visible in the Smart Report before the predecessor browser test failed at the report-center row-search assertion. Artifact: [browser proof run 38149353444](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38149353444) / [artifact 11706298027](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38149353444/artifacts/11706298027).

## Remaining failures / uncertainty

- Latest exact-head Full Product Browser E2E run: [38150429588](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38150429588) was pending with no jobs surfaced when this note was saved; its final result is NOT YET PROVEN.
- At predecessor `6bdb4c2`, browser proof stopped before the new CSV upload because the test expected a mismatched Arabic placeholder string. The source UI already had a functioning row-search input. The assertion and row-level interaction have now been corrected, but they must pass in a subsequent actual browser run.
- The `Session Handoff Contract` failed because the older session report omitted eight changed files; this new checkpoint updates the persistent resume documents to the exact code/test head. Its result must be read back after this commit.
- Build, quality and Vercel status were still in progress/pending at checkpoint time. Do not treat pending checks as success.
- No merge or production deployment is claimed.

## First active failure

The earliest confirmed failure on the immediately preceding browser run was `REPORTS_CENTER_ROW_SEARCH_MISSING`, caused by the test expecting a different Arabic input placeholder. The corrected test now asserts the actual placeholder and performs a filter/reset interaction against source rows. The new exact-head run must establish whether this was the only blocker.

## Root cause

Two separate, verified defects were involved:
1. DOM attributes were dropped by the shared `Card` primitive, preventing the browser from selecting an intelligence card already present in the React composition.
2. Browser test text drifted from the actual Arabic placeholder by one leading letter, causing failure before the test could reach the new-upload journey. Canonical row data was also absent from the test's REST selection, so the test could not derive a source-grounded unique query until the query was expanded.

A previous infrastructure issue also existed: staging PostgREST schema-cache loading timed out (`57014` → `PGRST002`). The cache reload was confirmed separately on staging on 11 October; it is not a substitute for the current browser proof.

## Next exact action

Consume [Full Product Browser E2E run 38150429588](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38150429588) on code HEAD `a644ab51e06b37f75bb498851d36e970ed993144`. Inspect its terminal `result.json` and job log; if report-center search passes, continue until the fresh three-row upload reaches completed analysis, non-empty generic signals and recommendations, persisted readback, and refresh with the exact same `reportJobId + sourceHash + sourcePath`. Repair the first actual failed assertion only, then retest on the exact current head.

`SESSION HANDOFF = READY`  
`ACTION_STATUS = ACTIVE_EXECUTION`  
`REPORT_FOR_HEAD = a644ab51e06b37f75bb498851d36e970ed993144`  
`PRODUCT_COMPLETE = NO`  
`DO_NOT_MERGE = true`
