# Execution Report — 2026-10-11T19:05:00+03:00

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912), OPEN / NOT MERGED
- `REPORT_FOR_HEAD`: [`732e71ee4a929ad97485d92ce8f98cfa2ee79838`](https://github.com/Report-Engainall/Report-Advisor/commit/732e71ee4a929ad97485d92ce8f98cfa2ee79838)
- Main base: `fa1ab4cbade9b01685507aa966c10f700a03f576`
- Product state: `PRODUCT_COMPLETE = NO`

## Changes actually committed before this report

- Added `src/lib/file-engine/generic-source-rows.ts` and wired it into `src/lib/report-smart.ts`. Canonical rows have priority. Only a count-complete snapshot belonging to the same tenant + sourceHash + importJobId can be used as fallback; partial or conflicting snapshots return unavailable. Snapshot use remains review-only rather than decision-ready.
- `src/pages/SmartReportPage.tsx` no longer substitutes specialty intelligence for a null generic layer.
- `src/components/GenericFileIntelligenceCard.tsx` explicitly renders unavailable/partial scope and source identity; this complements the existing signals/recommendations/evidence collection rendering.
- `src/pages/ReportsPage.tsx` now visibly renders report job ID, SHA-256, and source path. The browser script checks current DOM after filter reset instead of a stale pre-filter body snapshot.
- `scripts/generic-file-analysis.test.mjs` covers canonical priority, complete fallback, partial preview rejection, and row-count conflict. Its canonical row fixture was corrected to use the row payload shape consumed by the helper.
- `scripts/smart-report-complete-intelligence-surface.test.mjs` checks the general-only card, source lineage, and full result collections; duplicate top-level ESM declarations were renamed after exact-head CI exposed them.

## Exact-head tests

- [Product Build Gate 38153881907](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153881907): SUCCESS.
- [Quality 38153881804](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153881804): SUCCESS.
- [Data-quality runtime 38153881601](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153881601): SUCCESS.
- [Full Product Browser E2E 38153881729](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153881729): PENDING (no completed job/result available at capture). No authenticated browser or persisted readback proof claimed.
- [Final Certification 38153881876](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153881876) and [Session Handoff 38153881674](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153881674) failed due the previous handoff report still covering c953c62; logs named only `scripts/generic-file-analysis.test.mjs` and `scripts/smart-report-complete-intelligence-surface.test.mjs` as uncovered. This report covers the updated test/code head. The next certification/handoff result must confirm the governance update.
- The earlier browser run [38153724487](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153724487) was still running the real Chromium proof on ancestor e3554c0; it does not prove the current code head.
- PC01 is offline; no local tests are claimed.

## Open requirements

1. Complete browser journey of a non-fixture upload to all general findings/signals/recommendations/evidence, not only one sample file.
2. Persist → readback → refresh → same reportJobId/sourceHash/sourcePath.
3. Repeat on varied file types / structures and demonstrate the specialty layer is added, not substituted.
4. Confirm the new session handoff and certification contracts after this report is committed.
5. Confirm the current deployed preview or production release with a real browser; none is claimed here.

## Next action

Inspect the pending exact-head Full Product Browser E2E run; fix its first actual failure, and repeat until source-bound upload/readback/refresh is proven.

