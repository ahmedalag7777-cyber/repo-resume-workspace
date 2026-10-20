# Execution Report — 2026-10-11T19:00:00+03:00

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- Pull request: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED
- `REPORT_FOR_HEAD`: [`c953c62872f545b112bc2bd81d31c4016a5b2be4`](https://github.com/Report-Engainall/Report-Advisor/commit/c953c62872f545b112bc2bd81d31c4016a5b2be4)
- Main base: `fa1ab4cbade9b01685507aa966c10f700a03f576`
- Product status: `PRODUCT_COMPLETE = NO`

## Actual changes

1. Preserved the existing intelligence core. The generic layer remains calculated by the existing `buildGenericFileIntelligence` and is composed with specialty output; this round fixes availability and presentation rather than rebuilding the engine.
2. Added `selectGenericSourceRows` in `src/lib/file-engine/generic-source-rows.ts`. Canonical rows are preferred; a source-analysis dataset is a fallback only when it contains exactly its declared number of rows and agrees with source-analysis row count under the existing source identity query. Partial or conflicting snapshots are rejected.
3. Added behavioral cases in `scripts/generic-file-analysis.test.mjs` for canonical precedence, full snapshot fallback, partial-preview rejection, and row-count mismatch.
4. The Smart Report general-analysis card now receives `report.genericIntelligence` only. A missing general layer has an explicit unavailable state instead of a specialty result mislabeled as generic. Partial row coverage and extraction-snapshot derivation are identified in the UI.
5. Reports Center now visibly renders `primarySmartReport.jobId`, `primarySmartReport.sourceHash` and `primarySmartReport.sourcePath`. Browser proof re-reads current body text after clearing the row search, and source-lineage assertions are part of the UI contract.

## Verification evidence

- [Product Build Gate run 38153490187](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153490187): `in_progress` at report capture.
- [Quality run 38153490266](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153490266): `queued` at report capture.
- [Full Product Browser E2E run 38153490082](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153490082): `pending`, no job result available at report capture.
- [Session Handoff Contract run 38153486804](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153486804): failed due to stale report coverage listing eight unreported files. The following governance-only checkpoint uses this code head as `REPORT_FOR_HEAD` and lists the actual modified files.
- The previous browser run [38152137432](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38152137432) failed at `REPORTS_CENTER_JOB_ID_NOT_VISIBLE`. The specific UI omission is fixed in `c953c62`, but new browser proof remains pending.
- Vercel and Netlify preview are processing; neither status establishes a tested deployment.
- Developer PC01 is offline; no local tests are claimed.

## Remaining

- Exact-head build/typecheck and focused selector/UI contract result.
- Fresh upload → generic signals and recommendations visible → saved output readback → refresh → same reportJobId/sourceHash/sourcePath.
- Authenticated multi-source proof across different supported formats.
- Review Phase-F staging resilience and backup/restore failures as separate work; they are not evidence about the generic analysis patch.
- Production deployment and full product completion remain unproven.

## Next action

Poll the exact code-head actions above, inspect the first terminal failure, patch the root cause, and rerun the same workflow before considering PR merge.

