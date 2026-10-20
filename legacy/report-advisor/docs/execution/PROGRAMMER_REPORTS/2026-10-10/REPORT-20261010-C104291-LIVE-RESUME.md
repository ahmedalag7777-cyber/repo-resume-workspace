# EXECUTION REPORT — 2026-10-10 — source-bound context and generic intelligence browser proof

**Repository:** `Report-Engainall/Report-Advisor`  
**Branch:** `fix/source-bound-generic-intelligence-20261009`  
**PR:** [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED  
**Report/checkpoint SHA:** `c10429178ba4f414b27c254b1675b8daf0f6ddc1`  
**Base SHA:** `fa1ab4cbade9b01685507aa966c10f700a03f576`  
**Product complete:** NO

## Work completed and source evidence

1. **Preserved explicit report identity in Reports Center.** Commit [d51bb6f](https://github.com/Report-Engainall/Report-Advisor/commit/d51bb6fe22a55da9f2533708983d6c05e08a5974) changes `src/pages/ReportsPage.tsx` to read optional `reportJobId` and `sourceHash` URL parameters, resolve that exact report in the authenticated tenant, and reject mismatched identity rather than silently selecting `catalog[0]`.
2. **Made the browser contract exercise the same report context.** Commit [943102b](https://github.com/Report-Engainall/Report-Advisor/commit/943102bafef58cb84feba9df56fc65efe31614c4) passes the exact current report ID + source hash to `/reports`. Commit [639f5d9](https://github.com/Report-Engainall/Report-Advisor/commit/639f5d92ed3b9768dd1d48e9a732cdd92561e07c) adds source-context contract assertions.
3. **Added browser assertions for the universal layer.** Commit [ae75608](https://github.com/Report-Engainall/Report-Advisor/commit/ae75608296a7bdff7d271e87439dace0f3817eb8) checks the general intelligence card is visible on the Smart Report even when specialty is detected; asserts exact report job ID, source path and SHA-256; and requires visible signal/recommendation regions.
4. **Restored the missing saved views schema for clean-restore parity.** Migration `supabase/migrations/20261010165742_restore_saved_views_schema_parity.sql` is committed and applied to **Staging only** (project ref `fnqbvfuwbdpwvhcgzksl`). A database readback proved 9 columns, 4 constraints, 3 indexes, RLS enabled, policy `saved_views_owner` scoped by both `current_company_id()` and `auth.uid()`, authenticated CRUD privileges and zero anon privileges. Production schema was not changed.
5. The generic analysis functions/card were already present in the PR; no brain/engine rewrite was performed. Existing `scripts/generic-file-analysis.test.mjs` contains format cases for TXT, CSV, JSON, JSONL, XML, YAML, Markdown, RTF, XLSX and unknown readable text. Current-head CI still needs to prove these and the authenticated browser journey.

## Confirmed blocker history

- Previous Full Product Browser E2E [run 38065584337](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38065584337) failed at `REPORTS_CENTER_CURRENT_JOB_READBACK_MISSING`, although Smart Report durable-source checks passed for report `16709d80-e012-40ef-9c12-6fd8255897f8`, source `تقارير ادارية.xlsx`, SHA-256 `587f2d3dbdc7ec1ccc8c988ccad72f84b6cf2b794fcbce6711ffe5ecf9d6b313`, 332 rows, quality 98 and trust TRUSTED. The Reports Center selection defect above directly targets that gap.
- Previous Device-Independent Browser E2E [run 38065584293](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38065584293) found a Postgres `57014 statement timeout` for `/reports/sales` at a 500-row sales-invoice request. Staging EXPLAIN showed a company/date index and incremental sort but did not reproduce an authenticated timeout; this is unresolved until the new browser run confirms whether it repeats. Financial semantics and missing-value handling were not weakened.
- Previous Phase-F live resilience [run 38065584312](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38065584312) failed clean restore because `public.saved_views` was absent from the restore schema; the tracked staging-applied parity migration now addresses that missing relation. The latest clean-restore gate remains unproven until it completes.

## Current deployment and gate state

- Netlify PR preview: [https://deploy-preview-912--aghbari-report-advisor.netlify.app/](https://deploy-preview-912--aghbari-report-advisor.netlify.app/) is READY at app-code SHA `ae75608296a7bdff7d271e87439dace0f3817eb8`. A later docs-only Netlify event was cancelled as “no content change”; this is not an application build failure.
- Vercel preview for the latest docs checkpoint: [https://report-advisor-35w5janp3-injaz2.vercel.app/](https://report-advisor-35w5janp3-injaz2.vercel.app/) is READY at `c10429178ba4f414b27c254b1675b8daf0f6ddc1`.
- Production Netlify alias remains on old main commit `858ef8e3e5bc5bf74430555eadfb9e6767be348b`; production was not updated or promoted.
- The current code/test run cohort at checkpoint SHA `c10429178ba4f414b27c254b1675b8daf0f6ddc1` is not yet complete. As last queried, Quality [38070293237](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38070293237), Product Build [38070293366](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38070293366), Full Product Browser [38070293490](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38070293490), Device-Independent Browser [38070293268](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38070293268), Phase-F [38070293496](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38070293496), Report Value Cohort [38070293415](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38070293415) and Session Handoff [38070293310](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38070293310) were queued. Desktop Windows [38070293439](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38070293439) was in progress; its web application build step had passed and desktop dependency installation was still running. No browser/restore PASS is claimed from queued jobs.

## State separation

- Implemented: Reports Center identity handling, test additions, saved_views restore migration.
- Persisted: GitHub commits and current staging migration/readback.
- Preview deployed: yes (the code-containing PR preview is READY).
- Browser-proven: not yet at the current code head.
- Clean-restore-proven: not yet at the current code head.
- Production-proven: no.
- Product complete: no.

## Single next action

Consume current-head browser, quality/build and Phase-F run results, read the first failed job logs, and repair that proven blocker. Confirm source job/hash remain unchanged through refresh and Reports Center; verify the clean logical restore. If the sales timeout repeats, capture a real query/runtime diagnosis before altering query semantics or adding indexes. Keep PR #912 open and do not declare completion until the varied-file browser journey and source-lineage persistence both pass.
