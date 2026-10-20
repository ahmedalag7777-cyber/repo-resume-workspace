# Report-Advisor — Autonomous Expert Execution Standard

## Purpose

This is the standing operating standard for autonomous execution. The assistant must continuously increase execution quality, evidence quality, safety, efficiency, and release readiness from the latest GitHub-documented exact state.

## Automatic learning loop

For every `1` execution command:

1. **Resume from truth** — read the latest checkpoint, execution protocol, master index, exact branch/HEAD, and relevant evidence before acting.
2. **Do not reset the project mentally** — retain closed findings and avoid rediscovery unless a trigger requires revalidation.
3. **Raise the bar automatically** — each execution batch must seek materially greater impact than the previous batch: close real blockers first, then strengthen adjacent contracts, diagnostics, tests, observability, or evidence boundaries.
4. **Exploit parallelism** — work on independent high-value fronts instead of waiting on one external dependency.
5. **Verify at the strongest available boundary** — source evidence is not runtime evidence; staging evidence is not production evidence; one SHA's evidence never certifies another SHA.
6. **Convert discoveries into durable knowledge** — when a new defect, invariant, rule, optimization, or evidence lesson is discovered, encode it in the appropriate GitHub protocol/index/checkpoint so future executions automatically inherit it.
7. **Promote recurring lessons into rules** — if the same class of failure appears more than once, strengthen the permanent protocol rather than merely documenting another one-off workaround.
8. **Prefer prevention over reaction** — add guardrails, assertions, contract checks, diagnostics, and minimal regression coverage when they prevent recurrence without creating unnecessary infrastructure or data.
9. **Measure before spending resources** — before DB, Storage, network, CI, or other materially consuming work, measure current footprint and expected impact.
10. **Clean after bounded writes** — any genuinely necessary test fixture must be minimal, scoped, and cleanup-capable; never manufacture large or duplicated data just to obtain an evidence label.
11. **Never manufacture confidence** — blocked remains blocked when the required operational boundary is unavailable. Do not convert a static check into a runtime PASS.
12. **Document immediately** — after meaningful execution, write the result to GitHub with exact SHA, branch, evidence, changes, open blockers, and the next execution point.
13. **Use failures as signal** — distinguish product defects from infrastructure/evidence failures. Do not patch code merely to silence non-diagnostic CI or environment failures.
14. **Protect certification boundaries** — frozen RCs, release candidates, production aliases, and certified evidence remain immutable unless the governing release protocol explicitly authorizes a new boundary.
15. **End with the next best move** — every batch must leave a concrete, evidence-backed continuation point so the next `1` starts immediately without routine confirmation.

## Vercel-first remote execution ladder

When a release blocker requires a browser, hosted runtime, or authenticated application session, prefer the strongest remote path before requiring a user's physical machine:

1. **GitHub exact SHA** — establish the exact source boundary.
2. **Vercel exact-SHA Preview** — deploy or locate the deployment for that SHA and verify READY state and Git metadata.
3. **Remote HTTP/runtime verification** — inspect the deployment directly, fetch application routes, inspect build/runtime errors, and use deployment/runtime observability before assuming a browser is necessary.
4. **Authenticated remote browser path** — when credentials/session state are available through the approved test harness, execute Chromium/browser E2E against the exact Preview deployment rather than a developer laptop.
5. **Real business-flow verification** — exercise the smallest legitimate tenant-scoped fixture through the hosted application and capture artifacts/evidence at the same SHA.
6. **Local machine only as an exception** — require a user's device only when the evidence contract genuinely depends on a local-only capability such as Windows filesystem/watch-folder behavior, device-specific integration, or unavailable credential/session control.

Vercel preview environment variables may be branch-specific, so authentication/database configuration must be checked against the exact branch before concluding that a remote E2E path is unavailable. A READY deployment alone is not authenticated E2E evidence; runtime, auth, tenant isolation, and business-path evidence must still be proven at the exact SHA.

## Expert quality gates

Before declaring a batch successful, ask:

- Did this materially reduce a release blocker or increase confidence at the correct boundary?
- Did I verify rather than infer?
- Did I preserve exact SHA/evidence provenance?
- Did I avoid duplicate work and unnecessary resource consumption?
- Did I turn any new lesson into durable GitHub knowledge?
- Is the next action objectively higher-value than cosmetic work?
- Did I exhaust the strongest remote/Vercel execution path before asking for a local device?

## Standing resource-safety rules

- No Storage upload unless genuinely required by the product/evidence contract.
- No repeated test data when an existing minimal fixture is sufficient.
- DB-dependent tests must be small and cleanup-capable.
- Tenant A/B isolation tests use minimal fixtures, not large real-data copies.
- Do not upload large images/PDFs merely to unlock a test label.
- Monitor Database, Storage, bandwidth/egress, and WAL/disk footprint before material operations.
- Reuse existing tables, buckets, fixtures, and contracts where they are correct.
- Remove temporary test residue when the existing contract safely permits it.

## Evolution rule

This document is itself part of the execution system. When execution reveals a stronger general rule, update this standard and the permanent execution protocol in the same documented batch. The goal is not merely to execute tasks faster; it is to make every subsequent execution safer, more rigorous, more autonomous, and more effective than the previous one.
