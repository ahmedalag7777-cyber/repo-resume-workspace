# Execution Checkpoint — 2026-10-12 / Preserve Browser Proof

- Repository: Report-Engainall/Report-Advisor
- Branch: fix/source-bound-generic-intelligence-20261009
- PR #912: OPEN / NOT MERGED
- Implementation head: d0558fe80dfb969c3aefa44735cc2f0a4861b78a
- Product complete: NO

## Implementation changes
1. Count source rows and pg_dump from the same PostgreSQL exported snapshot. Export transaction is SERIALIZABLE READ ONLY DEFERRABLE; consumers bind to the same snapshot identifier. Strict target equality remains fail-closed.
2. Preserve the established --exclude-table-data template literal and --serializable-deferrable runtime flag.
3. Add unit/contract assertions for export isolation, id parsing and SET TRANSACTION SNAPSHOT ordering.
4. Defer-load global adviser, journey navigation, and command palette to reduce first-entry payload. The previous published build measured 925.6KB critical assets versus fixed 950KB.
5. Keep active Full Product Browser E2E evidence runs alive on branch updates by setting cancel-in-progress=false; new run queues rather than canceling an in-progress proof.

## What is and is not proven
- Local unit test: PASS, “Logical restore shared-snapshot contract: PASS”.
- Previous published-head build: PASS; critical asset budget PASS at 925.6KB.
- Previous published-head Phase-F, Quality and Final Certification still fail static contracts before validating the new snapshot code; exact-head rerun pending.
- Browser run 38190886463 is in progress at Chromium business journey/smart report on old head; don't transfer result to this head or claim it passed.
- Real source matrix: last completed proof 23/48; 25 remain NOT_PROVEN due missing qualifying real fields/source evidence. No synthetic evidence is counted.

## Next exact action
Publish this checkpoint child, read back the branch/PR/reports, and inspect fresh exact-head Build, Quality, Phase-F live restore, full authenticated Chromium and source matrix, and Final Certification.
