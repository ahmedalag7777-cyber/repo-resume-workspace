# Execution Checkpoint — 2026-10-12 / Preserve pg_dump Contract

- Repo: Report-Engainall/Report-Advisor
- PR #912: OPEN / NOT MERGED
- Implementation candidate: cb038f3b0a39c1c4ba895b8e3aedaad57ad1da64
- PRODUCT_COMPLETE: NO

## First failure proved
Phase-F Live Resilience run 38191589811 failed step 8, local operational runtime tests, before live database backup or restore. The source assertion requires the pg_dump option string to use the established template interpolation form for volatile table exclusions, including the exact sequence --data-only ${volatileExcludeArgs}.

## Correction
Commit cb038f3b0a39c1c4ba895b8e3aedaad57ad1da64 restores the original template-literal form while preserving:
- SERIALIZABLE READ ONLY DEFERRABLE snapshot exporter;
- pg_export_snapshot() with the same snapshot identifier passed to both count query and pg_dump;
- --serializable-deferrable and --snapshot flags;
- strict row parity and table exclusion list.

No assertion or acceptance threshold was weakened. This commit is not yet validated by Actions.

## Other confirmed state
- Published 008b Build Gate PASS.
- Published 008b critical assets 925.6KB vs fixed 950KB.
- Handoff / Execution Enforcement on fe5aef99 passed.
- Browser run 38190886463 is still active on prior head; do not cancel or treat as proof.
- Real source coverage remains 23/48, with 25 archetypes NOT_PROVEN due required source fields absent in eligible real records.

## Next
Publish correction plus docs-only child, read back GitHub, then inspect exact-head Phase-F live backup/restore, Build, Quality, full Browser E2E and final certification.
