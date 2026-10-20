# Execution Checkpoint — 2026-10-12 / Query Source Snapshot Binding

PR #912 OPEN / NOT MERGED. Latest code commit: 67b80874d51fa0687cc0d7160e28bf6b4f7ff1d0. PRODUCT_COMPLETE=NO.

Root cause: Phase-F source contract required the resolved querySource URI. The source counts/exported snapshot used querySource but pg_dump still used runnerSource. Commit 67b80874d51fa0687cc0d7160e28bf6b4f7ff1d0 changes the pg_dump call to runDockerPgDump(querySource, backupPath, exportedSnapshot.snapshotId), without altering strict parity checks or flags.

Static contract fix is already in commit 6d2db... (check that probe invokes buildExportedSnapshotSql() while helper owns pg_export_snapshot()). Prior runtime failures and thresholds were not masked. Live restore needs a fresh exact-head PASS. Browser/source coverage remains unproven: last completed real-source matrix 23/48. Critical asset budget on older build 925.6KB against unchanged 950KB limit.

Next action: publish this documentation-only child and inspect the exact-head Phase-F, build, quality, browser/source matrix, and final certification.
