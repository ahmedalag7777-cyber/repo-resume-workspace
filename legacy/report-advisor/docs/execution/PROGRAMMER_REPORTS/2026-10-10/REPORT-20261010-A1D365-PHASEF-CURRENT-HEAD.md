# EXECUTION REPORT — 2026-10-10T22:10:00+03:00 — current-head Phase-F and browser proof status

Repository: `Report-Engainall/Report-Advisor`  
Branch: `fix/source-bound-generic-intelligence-20261009`  
PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED  
Current code/workflow head: `a1d365d3e08a20cbb5ab27f4e708435c1ec724d8`  
Main base: `fa1ab4cbade9b01685507aa966c10f700a03f576`  
Product complete: NO.

## Confirmed product/code changes
- Reports Center respects exact `reportJobId + sourceHash` and rejects silent substitution: [d51bb6f](https://github.com/Report-Engainall/Report-Advisor/commit/d51bb6fe22a55da9f2533708983d6c05e08a5974).
- Full Product Browser asserts the general intelligence card is visible even for specialized report contexts and verifies exact source path/hash/job ID and signal/recommendation areas: [ae75608](https://github.com/Report-Engainall/Report-Advisor/commit/ae75608296a7bdff7d271e87439dace0f3817eb8).
- Generic file engine/card was already present and remains intact. Existing quality logs explicitly reported `GENERIC FILE ANALYSIS PASS`.
- `saved_views` restore schema parity migration `20261010165742_restore_saved_views_schema_parity` is tracked and applied to Staging only; readback verified RLS, tenant+user owner policy, 9 columns, 4 constraints, 3 indexes, authenticated CRUD, and zero anon grants.
- Bounded retry from [81c6b39](https://github.com/Report-Engainall/Report-Advisor/commit/81c6b393c587f37d1c7e8750f01b65fa907f29b1) retries only transient pre-query DB connection failures; SQL/statement-timeout errors are not retried.
- Current head [a1d365d](https://github.com/Report-Engainall/Report-Advisor/commit/a1d365d3e08a20cbb5ab27f4e708435c1ec724d8) preserves the Phase-F main-push trigger while maintaining resilience-specific path filters.

## Root cause from live telemetry
Supabase Auth could not connect to its internal Postgres endpoint for `supabase_auth_admin`. Peak log windows included 81 token 504s + 25 token 500s, then 98 token 504s + 47 admin-user 504s. Latest available aggregation (19:04–19:05 UTC): 10 `/token` 504s, 7 `/admin/users` 504s and 4 500 failures. These are pre-UI service failures; they do not by themselves establish a generic-card defect. Multiple old PR-head workflows were concurrently testing Auth, storage, Phase-F, evidence and cohort.

## Current-head gate state last checked
- Data Quality Runtime [38078344758](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344758): PASS on `a1d365d3e08a20cbb5ab27f4e708435c1ec724d8`.
- Phase-F [38078344665](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344665): still in `Live resilience probes`. Local operational tests, static contracts, Canary auth, runtime-target resolution and preview provenance passed; final live backup/restore not yet proven.
- Report Value Cohort [38078344810](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344810): 40-report cohort in progress.
- Product Build Gate [38078344906](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344906): dependency installation in progress, remaining typecheck/build/contract steps pending.
- Quality [38078344863](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344863): in progress.
- Session Handoff [38078344759](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344759): failed because the prior `REPORT_FOR_HEAD=12b7106...` did not cover the later code/workflow change to `.github/workflows/phase-f-live-resilience.yml` in a1d365. This report now pins `REPORT_FOR_HEAD=a1d365d3e08a20cbb5ab27f4e708435c1ec724d8`; changes after the baseline should be docs-only.
- Full Product Browser [38078344827](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344827): pending behind the predecessor [38078166196](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078166196), where build and canonical heart tests passed but actor provisioning was still running.
- Device-Independent Browser [38078344615](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344615): smoke/auth sequence pending; its authenticated duplicate is manual-only by design.
- Storage [38078344813](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344813), Commercial [38078344745](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344745), Evidence Passport [38078344668](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38078344668): queued.
- Netlify PR preview for a1d365 is READY (deploy `6aca8c3e67d5080008110c6d`). Vercel is rate-limited; production has not been promoted.

## State separation
Implemented: source-context guard, visible generic-card browser assertions, bounded transient retry and CI latest-run controls.  
Persisted: GitHub code/workflow commits and Staging-only schema parity.  
Preview deployed: yes, Netlify head a1d365.  
Generic format/unit tests: previously passed.  
Authenticated browser: not yet proven on a1d365.  
Clean restore: not yet proven on a1d365.  
Production: not updated.  
Product complete: NO.

## Single next action
Consume current-head Full Product Browser, Phase-F, Report Cohort, Build/Quality and handoff results; read the first actual failed job logs and fix the proven cause. Prove upload → visible general + specialist findings → saved/readback → refresh/re-entry retaining the exact source SHA before merging.
