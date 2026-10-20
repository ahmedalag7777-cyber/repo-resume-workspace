# Execution Checkpoint — 2026-10-12 / Snapshot Helper Contract Location

PR #912 is OPEN / NOT MERGED. Code head: 6d2dbbeae07e3641bfd2ce20d9f080245a505108. PRODUCT_COMPLETE=NO.

The Phase-F run 38191738163 failed before live DB operation because the static check demanded pg_export_snapshot() inside the probe file, although the SQL is owned by src/server/logical-restore-snapshot.mjs. Commit 6d2dbbeae07e3641bfd2ce20d9f080245a505108 corrects the check to require buildExportedSnapshotSql() and --snapshot in the probe; the helper remains checked for pg_export_snapshot() and SERIALIZABLE READ ONLY DEFERRABLE. No acceptance guard was removed.

Single exported PostgreSQL snapshot is intended for both source counts and pg_dump; strict restored row parity remains fail-closed. The pg_dump command keeps --serializable-deferrable and the exact exclusion template. Local unit test passed, but live restore is still pending. Earlier critical assets fell to 925.6KB / 950KB. Latest complete real-source matrix remains 23/48; 25 are NOT_PROVEN. Old browser run 38190886463 is on an older head.

Next: publish this documentation-only child and inspect exact-head Phase-F, Build, Quality, full authenticated browser/source matrix, and final certification.
