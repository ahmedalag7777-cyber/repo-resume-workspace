# Execution Report — 2026-10-12 — archetype runtime fixture coherence

Repository: Report-Engainall/Report-Advisor
Branch: fix/source-bound-generic-intelligence-20261009
PR #912: OPEN / NOT MERGED — https://github.com/Report-Engainall/Report-Advisor/pull/912
Code head: ef9e837f5ff50976cfc37a182f8e31e73e5e44ea
Commit: https://github.com/Report-Engainall/Report-Advisor/commit/ef9e837f5ff50976cfc37a182f8e31e73e5e44ea
PRODUCT_COMPLETE = NO.

## Failure proven
Full Product Browser E2E run 38188122208 at parent head 63580539b58909d419db73d1575dc2d82579a7e9 failed the canonical runtime contract with “Archetype-specific advisory question must be answered for sales.over-time”. The source-key and short-window regression tests had passed before the runtime contract.

## Root cause and repair
The contract claimed rowCount/sampleSize=12 while canonicalRows contained only one row dated 2026-01-01. A source-derived trend needs multiple observed periods, so the advisory question correctly remained unanswerable. scripts/check-48-archetype-runtime-contract.mjs now builds 12 actual canonical rows across 12 months and the declared profile fields. All assertions remain strict: answer, model signal, recommendation, claims, proof state and lineage. No gate threshold was weakened.

## Related implementation
Commit 4d682ed013ff5804d744b6ebe72ccd99a002918a: source row key resolution, Arabic net amount alias, source-key regression, plus customer reports catalog search/filter/pagination and fingerprint UI.

## Historical matrix
Older heads showed 21/48 at 26334116 and 23/48 at 717b8f. Do not transfer these results to the new head; the real-source matrix still requires 48/48.

## One next action
Commit and read back this checkpoint, verify new exact-head handoff/build/quality/browser evidence, fix the first proven failure and only then assess real-source coverage. Keep PR open and production untouched.
