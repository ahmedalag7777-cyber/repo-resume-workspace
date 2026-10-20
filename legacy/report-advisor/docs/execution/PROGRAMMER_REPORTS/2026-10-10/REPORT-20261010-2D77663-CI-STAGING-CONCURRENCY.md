# EXECUTION CHECKPOINT — 2026-10-10T21:40:00+03:00 — staging concurrency fix and report cohort proof

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912), OPEN / NOT MERGED
- Exact code/CI head: `2d77663a8fea44cfbc98e367cca48107a63d3ec2`
- Base/main: `fa1ab4cbade9b01685507aa966c10f700a03f576`
- Product completion: NO

## Executed change

Commit [2d77663](https://github.com/Report-Engainall/Report-Advisor/commit/2d77663a8fea44cfbc98e367cca48107a63d3ec2) updated four workflow definitions atomically:
- `.github/workflows/full-product-browser-e2e.yml`
- `.github/workflows/device-independent-smoke.yml`
- `.github/workflows/phase-f-live-resilience.yml`
- `.github/workflows/report-value-cohort.yml`

The two authenticated browser workflows share a non-cancelling PR/ref concurrency group. Logical restore and report-value cohort share a separate non-cancelling heavy-database group. This reduces parallel staging contention; it does not guarantee every other database-touching workflow is serialized.

## Exact-head results

- Report Value Cohort [run 38076567370](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567370): PASS on `2d77663a8fea44cfbc98e367cca48107a63d3ec2`; 40-report proof uploaded (artifact ID 11679650509). Source states REVIEW / INSUFFICIENT SAMPLE were preserved where evidence did not support stronger conclusions.
- Full Product Browser E2E [run 38076567127](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567127): IN PROGRESS at checkpoint; build step still running. Prior e0a3 run failed before UI assertions because Supabase Auth returned HTTP 504.
- Phase-F [run 38076567468](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567468): IN PROGRESS at checkpoint. Clean restore not yet proven; previous run failed pooler checkout (ECHECKOUTTIMEOUT), with 3/4 probes passing.
- Device-Independent Browser E2E [run 38076567296](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567296): PENDING behind the shared browser lane.
- Product Build [38076567171](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567171), Quality [38076567159](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567159), Data Quality Runtime [38076567488](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567488): IN PROGRESS.
- Session Handoff [38076567285](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567285): FAIL, stale report omitted the four workflow files changed in this commit. The new current report pins `REPORT_FOR_HEAD=2d77663a8fea44cfbc98e367cca48107a63d3ec2`, so changes after that baseline should now be docs-only; the follow-up handoff run must pass.

## Existing source-bound product work

- Reports Center validates exact `reportJobId + sourceHash` rather than silently selecting the newest report: [d51bb6f](https://github.com/Report-Engainall/Report-Advisor/commit/d51bb6fe22a55da9f2533708983d6c05e08a5974).
- Authenticated browser asserts the general intelligence card is visible, matches source path/SHA/report ID, and exposes signal/recommendation areas: [ae75608](https://github.com/Report-Engainall/Report-Advisor/commit/ae75608296a7bdff7d271e87439dace0f3817eb8).
- Generic file analysis tests already logged `GENERIC FILE ANALYSIS PASS`; the engine was not rebuilt.
- Staging-only `saved_views` migration `20261010165742_restore_saved_views_schema_parity` was applied and read back with RLS, owner policy, authenticated CRUD and zero anon grants. Production DB was not changed.

## Next action

Consume current-head browser and restore results; inspect failed logs and repair only proven causes. Prove varied-file upload → visible full generic + specialist results → saved readback → refresh/re-entry with the same source hash. Do not merge or declare product complete until this journey and clean restore are proven.
