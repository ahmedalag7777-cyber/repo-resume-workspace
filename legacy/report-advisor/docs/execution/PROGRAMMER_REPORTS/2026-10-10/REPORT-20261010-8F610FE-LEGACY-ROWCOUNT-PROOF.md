## ARCHIVED EXECUTION REPORT — 2026-10-10 — legacy import row-count root cause proven

SESSION HANDOFF = READY
REPORT_FOR_HEAD = 8f610fef2a966b4ae179ba26f1dbfd2fdfdb2c4e
UPDATED_AT = 2026-10-10
REPOSITORY = Report-Engainall/Report-Advisor
APPLICATION_CODE_HEAD = 8f610fef2a966b4ae179ba26f1dbfd2fdfdb2c4e
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO

WHAT WAS VERIFIED:
- Read-only staging query over `report_execution_jobs`, `import_jobs`, `file_records`, `source_analysis_snapshots`, `canonical_import_commits`, `canonical_dataset_records`, `report_evidence_snapshots`, and `report_evidence_passports`.
- 49 unique import jobs have `total_rows=processed_rows=valid_rows=invalid_rows=0`, but all independent source-bound row proofs match: report rendered row count = analyzed snapshot rows = canonical commit count = canonical dataset rows, and sourceHash = source fingerprint = source file hash = passport/snapshot hash; source file security is passed; all files are ready/processed/verified; quality >=70.
- Aggregate has 49 report proofs, 49 unique import jobs, 49 conflict-free and 0 conflicting import jobs, with proven row counts 1–886. These were SELECT-only reads; no rows changed yet.
- This exactly explains why the current passport refresh function marks those imports PARTIAL/REVIEW: its final guard requires import total/processed rows to equal the independently proven authoritative count, while legacy metadata is stored as zero.

PRODUCT FIXES ALREADY TRACKED:
- Shared specialty header normalizer + Arabic/English spaced-header regression.
- E2E source trust assertion corrected to distinguish trusted source (`موثوق`) from an unverified/pending evidence snapshot.
- VOI request schema parity migration and migration schema audit guard are tracked at code head `8f610fef2a966b4ae179ba26f1dbfd2fdfdb2c4e`.
- Free Netlify preview currently serves the same application SHA `8f610fef2a966b4ae179ba26f1dbfd2fdfdb2c4e` on `/try-report`; it shows the Arabic upload screen. This proves route/deploy content only, not upload/persistence.
- Exact-candidate CI remains queued; previous full browser test exposed a wording mismatch, not a hash/row-lineage mismatch. Historical value cohort has only 18/42 verified until legacy counter repair is proven.

NO DATA HAS BEEN MUTATED BY THIS CHECKPOINT.

NEXT EXACT ACTION:
Add a source-proof-gated idempotent migration that corrects only eligible all-zero legacy import counters, records row/hash/analysis/canonical evidence in `result_summary`, refreshes associated passports, then read back exact updated rows and rerun the cohort and Phase-F restore gates. The repair must not update a row where any hash, status, security, quality, or count disagrees.

---

