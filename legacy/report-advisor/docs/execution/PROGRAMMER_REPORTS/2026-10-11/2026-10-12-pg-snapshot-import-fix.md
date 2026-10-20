# Execution Checkpoint — 2026-10-12 / PostgreSQL Snapshot Import Fix

PR #912 OPEN / NOT MERGED
Code commit: eed9657cd82648d5f5b3167f49165f5765fda45c
Product complete: NO

## Actual live failure
Phase-F run 38192305923 on 97e335 reached the real backup/restore probe and failed at pg_dump:
a snapshot-importing transaction must not be READ ONLY DEFERRABLE.
The supplied snapshot was being imported into pg_dump's transaction while --serializable-deferrable was enabled. Those modes are incompatible.

## Fix
Commit eed9657cd82648d5f5b3167f49165f5765fda45c removes --serializable-deferrable only from pg_dump's snapshot-importer command. The exported source transaction stays SERIALIZABLE READ ONLY DEFERRABLE; source counts and pg_dump share that exact exported snapshot id and querySource connection; strict restore row parity is unchanged. Contracts now reject the invalid combination, rather than expecting it.

The same CI head revealed malformed JS syntax in scripts/check-phase10-backup-restore-contract.mjs: a literal escaped backtick caused the lint parser error. The same fix commit uses a normal quoted error message.

## Validation status
- Build PASS on 97e335 only (run 38192305935).
- Live restore on 97e335: FAIL for incompatible snapshot-importing transaction setting.
- Quality + Final Certification on 97e335: FAIL lint parsing issue; code corrected, rerun pending.
- Latest real-source matrix: 23/48, 25 NOT_PROVEN.
- PRODUCT_COMPLETE: NO.

## Next action
Publish documentation child and verify fresh exact-head build, quality/lint, Phase-F restore, full browser/source matrix and final certification.
