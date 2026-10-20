# Execution report — 2026-10-12 — Tenant-scoped source matrix

- Repository: Report-Engainall/Report-Advisor
- Branch: fix/source-bound-generic-intelligence-20261009
- PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912), open and not merged.
- Code head: [a6351f3b72f7](https://github.com/Report-Engainall/Report-Advisor/commit/a6351f3b72f7e4007f9ba8f4264cc33d3a3b46e2)
- Product complete: **NO**.

## Confirmed browser result

[Full Product Browser E2E run 38275049594](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38275049594) used code head `75f64f4b631b0da07fd9171eb6ef293798c79c34`. It completed the exact build, canonical heart regressions, open-report server proof, authenticated Chromium route/personalization proof, and business journey/smart report proof. It then failed the fail-closed governed real-source matrix: **23/48 supported; 25 NOT_PROVEN**. The target report company was `99e33354-cc45-4317-8eb3-0d486b6c5932`; the browser matrix actor's current company was `6426fbf9-7c4c-41b9-a6e7-9a0e58d5660b`. This difference is reported as a diagnostic and must not be hidden; every matrix result still needs source/passport/company identity consistency.

## Root cause and implementation

The matrix made global service-role reads capped at 5,000 rows for passports and completed report jobs, then filtered each returned page by tenant in memory. Because other tenants' rows occupy that global limit, valid jobs/passports can be omitted based on global sort order. A target-file diagnostic selected by `file_hash` only and returned file-record rows with the same hash/name in more than one company.

Commit [a6351f3b72f7] (https://github.com/Report-Engainall/Report-Advisor/commit/a6351f3b72f7e4007f9ba8f4264cc33d3a3b46e2) changes these queries to include `company_id` at the server-side filter boundary, and uses the target job's company when looking up the matching file record. Parent commit [bf7268bb6e4b1397b1e1335be5fb1bf81c7d3b19](https://github.com/Report-Engainall/Report-Advisor/commit/bf7268bb6e4b1397b1e1335be5fb1bf81c7d3b19) introduced shared real-source provenance screening for both matrix certification and passport refresh plus an executable regression test. This excludes known repository fixture paths, even when `report_corpus=true`, rather than treating fixtures as live data.

## UI update

The same parent commit adds targeted ink/indigo/brass styling to executive and import surfaces. This is a source change only; screenshot/build proof on the latest head remains pending.

## Still blocked

Current-head Build/Quality/Handoff/Phase-F/full browser/final certification, exact-head post-refresh re-login source identity, full strict real-source matrix, and live production deployment provenance are not yet proven. The public Netlify root currently embeds build-source SHA `858ef8e3e5bc5bf74430555eadfb9e6767be348b`, not this feature-branch code head.

## Next action

Read the newly triggered exact-head results. Inspect each NOT_PROVEN archetype's missing-field/provenance artifact and obtain eligible, real source data for remaining patterns. Keep 48/48 strict; do not fabricate fields or weaken the evidence checks. Keep PR #912 open.
