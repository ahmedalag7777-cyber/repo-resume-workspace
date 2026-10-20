# Execution checkpoint — 2026-10-12 — XLSX import source extension

Repository: Report-Engainall/Report-Advisor
Branch: fix/source-bound-generic-intelligence-20261009
PR #912: open, not merged
Code head: 5465692b6626166ce0df858ab562b206707349cc
Commit: https://github.com/Report-Engainall/Report-Advisor/commit/5465692b6626166ce0df858ab562b206707349cc

## Root cause
The added fresh XLSX scenario reused the shared authoritative import completion helper, but that helper always queried the persisted file record with filename marker + '.csv'. The workbook could upload correctly but never match the awaited source file row, so persistence proof would time out.

## Fix
- Added a CSV/XLSX format parameter to waitForAuthoritativeImportCompletion.
- It validates supported formats and queries the exact matching filename using the selected extension.
- importOne passes the actual format to the authoritative completion poller.
- The customer-facing contract now requires the format parameter and call-site propagation.
- Existing test flow keeps fresh CSV and freshly generated XLSX upload, canonical lineage verification, smart report readback, generic intelligence checks, and refresh.

## Proof status
- This is implementation evidence from commit 5465692b6626166ce0df858ab562b206707349cc, not runtime proof. Exact-head browser journey and matrix tests are pending.
- Older run 38182451467 at 9d8b673… passed 32/32 authenticated routes and the fresh CSV path but failed its final single-tenant archetype subprocess. The five-tenant real-source matrix had been skipped because it was gated behind browser success. The workflow now has a separate blocking matrix gate that checks exact head and 48/48 support.
- No merge or production deploy was made; Netlify production was observed on old commit 858ef8e3e5bc5bf74430555eadfb9e6767be348b.

## Next exact action
Read exact-head Full Product Browser E2E, result.json, real-48-source-matrix-preflight.json and artifacts for 5465692b6626166ce0df858ab562b206707349cc. Fix first evidenced failure and rerun required build, quality, handoff, resilience, final certification and production tests after merge only when ready.
