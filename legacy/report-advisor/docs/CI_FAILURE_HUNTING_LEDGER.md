# CI Failure Hunting Ledger

## Verified historical failure

Run `32648883941` failed at TypeScript checking on `src/lib/analytics/filter-context.ts` with `TS2536: Type 'K' cannot be used to index type 'DashboardFilterContext'`.

The failure was not masked or downgraded. A later quality run (`32654180460`) reached Typecheck successfully and then completed the remaining quality gates through Production Readiness, confirming that this historical failure class was subsequently removed from the active path.

## Guard added

`check-known-ci-regressions.mjs` preserves a regression guard around the affected filter-context contract and verifies that the quality workflow retains its TypeScript gate.

## Policy

Historical failures are evidence, not noise. Every reproducible failure class must either:
1. be fixed and covered by a regression guard, or
2. remain an explicit release blocker.

No failure is converted into a warning merely to obtain green CI.
