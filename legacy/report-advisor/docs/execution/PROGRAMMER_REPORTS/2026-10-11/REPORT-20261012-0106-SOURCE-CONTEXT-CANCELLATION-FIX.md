# Execution checkpoint — 2026-10-12 01:06 +03 — source-context network lifecycle fix

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912): OPEN / NOT MERGED
- Code-fix head: [`c4792cf6dedfafc549f96bb3b3f3205d5e7eebf2`](https://github.com/Report-Engainall/Report-Advisor/commit/c4792cf6dedfafc549f96bb3b3f3205d5e7eebf2)
- Main/base: `fa1ab4cbade9b01685507aa966c10f700a03f576`
- Product complete: NO; do not merge.

## Failure evidence

The pre-fix Full Product Browser E2E [run 38176651182](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651182) failed in browser job 114582010996. The uploaded generic CSV was registered (3 rows), then the browser captured GET 401 / PostgREST 42501 against `source_analysis_snapshots` after a tenant logout. Evidence artifact: [11716501331](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38176651182/artifacts/11716501331).

The schema migration intentionally revokes privileges on this table from `anon`, with tenant-bound `authenticated` SELECT policy. That security boundary is correct and was not changed.

## Code change

Commit `c4792cf6dedfafc549f96bb3b3f3205d5e7eebf2` changes `src/components/ReportSourceContext.tsx` to:
- Run catalog, context resolution and report-detail reads only on `CONTEXT_CONTINUITY_PATHS`.
- Hide stale source context when the current page does not participate in source-context continuity.
- Give each network-loading effect an `AbortController`, combine it with the existing 12-second timeout, and abort outstanding work on cleanup/unmount.

Root cause: the component was mounted on `/import`, which is outside `CONTEXT_CONTINUITY_PATHS`, yet its effects still read prior report catalog/detail data. Cleanup only suppressed stale state updates and never cancelled the actual request, allowing work to overlap route/auth changes. No anon grant, RLS relaxation, auth bypass, or intelligence-engine replacement was made.

The commit also extends `scripts/customer-facing-report-surface-contract.test.mjs` with explicit assertions for route scope, cleanup cancellation, timeout and render suppression, and adds `npm run test:customer-facing-report-surface` to the Full Product Browser E2E regression preflight. All changed files were read back from GitHub.

## Exact-head status

No exact-head runtime result has been confirmed yet for `c4792cf6dedfafc549f96bb3b3f3205d5e7eebf2`. The preceding head's Build, Quality, Handoff, Phase-F Live Resilience, Data Quality Runtime, Phase 2 Security and Final Certification runs passed individually, but those results are not transferred to the fix head. The new head must pass the focused contract and full authenticated browser journey with artifact/result readback.

## Next action

Refresh exact-head Actions, check the focused regression and Full Product Browser E2E at the SHA under test, read the first failing result/screenshot if any, then fix only that demonstrated issue. Keep PR #912 open and `PRODUCT_COMPLETE = NO`.
