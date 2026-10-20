# Execution checkpoint — 2026-10-12 01:00 +03 — authenticated source-context requests outlive route/auth state

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912): OPEN / NOT MERGED
- Exact code/test head inspected: [`47bcc617f1823ea6a50ef09bfa23cc3c585035d4`](https://github.com/Report-Engainall/Report-Advisor/commit/47bcc617f1823ea6a50ef09bfa23cc3c585035d4)
- Main base: `fa1ab4cbade9b01685507aa966c10f700a03f576`
- Product complete: NO; do not merge.

## Exact-head gate evidence

| Gate | Result | Run |
|---|---|---|
| Product Build Gate | PASS | [38176651300](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651300) |
| Quality | PASS | [38176651337](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651337) |
| Session Handoff Contract | PASS | [38176651263](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651263) |
| Phase-F Live Resilience | PASS | [38176651258](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651258) |
| Data Quality Runtime | PASS | [38176651305](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651305) |
| Phase 2 Security | PASS | [38176651340](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651340) |
| Final Certification Gate | PASS | [38176651261](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651261) |
| Full Product Browser E2E | FAIL | [38176651182](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651182), [artifact](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651182/artifacts/11716501331) |

## First proved failure

Authenticated Chromium reached the fresh generic upload journey. It then collected GET 401 / PostgREST `42501` errors for `source_analysis_snapshots`, with server message `permission denied for table source_analysis_snapshots`. The captured request follows a tenant-logout event in the browser result. The fresh CSV source/job existed: 3 rows, `reportJobId=2e129587-fdce-4bee-acb7-4b2ba905ce0a`, hash `sha256:567c5d126eebf952ad55815d031efcf205670baec9cfc3d3cdb6fe6dbde64e23`.

## Root cause from source inspection

`ReportSourceContext` is mounted on `/import`. Three effects load a recent report catalog, resolve a missing context, or read the stored report detail without first requiring `needsContextContinuity(location.pathname)`. But `/import` is not in `CONTEXT_CONTINUITY_PATHS`. Cleanup only flips an `active` boolean, so an already-started network request is not cancelled when route/auth context changes. The migration intentionally revokes all privileges on `source_analysis_snapshots` from `anon`, while allowing tenant-bound authenticated SELECT. This guard is correct and must remain unchanged.

## Actual work and next action

This checkpoint records the GitHub state, failed exact-head browser run, relevant source call sites, and RLS boundary before code edits. Next: confine ReportSourceContext's catalog/detail reads to intended context-continuity routes, AbortController-cancel requests on cleanup, add focused regression assertions, then run the contract, refresh exact-head gates and rerun Full Product Browser E2E. Do not treat this checkpoint or historical PASS results as proof of the pending browser journey.
