## ARCHIVED EXECUTION REPORT — 2026-10-10T18:05:00+03:00 — source-proven row-count reconciliation applied and read back

SESSION HANDOFF = READY
REPORT_FOR_HEAD = 84c881eae999ae218b2cf6b448394cbdc73d0775
UPDATED_AT = 2026-10-10T18:05:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
APPLICATION_CODE_HEAD = 84c881eae999ae218b2cf6b448394cbdc73d0775
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO

WHAT_I_WAS_ASKED_TO_DO
Resume PR #912 without recreating the intelligence core; make general analysis shared by all supported readable formats; present complete source-bound findings in File Lab and Smart Report; keep source trust separate from evidence-passport verification; persist every checkpoint and prove the user journey.

WHAT_I_ACTUALLY_DID
- Shared header normalizer/specialty inference and tests are tracked; the earlier TypeScript failure from a stale `inferSpecialty` reference was repaired.
- Added source/evidence trust-state E2E assertions matching the rendered Arabic label `موثوق` while independently retaining pending/review snapshot state.
- Added VOI request table restore-parity migrations and a schema-audit contract requiring table/index/RLS/tenant policy/grants/validation guards.
- Queried staging read-only and found 49 completed generic import jobs with zeroed legacy row counters while source-bound evidence matched across report render, source-analysis snapshot, canonical commit ledger and canonical dataset records. There were 49 unique candidates, 49 conflict-free proofs, and 0 conflicting proofs; expected row counts ranged 1–886.
- Applied guarded migration `reconcile_legacy_import_rowcount_from_source_proof` to staging. It updated only imports meeting exact hash, file security/status, render, analysis-quality, canonical commit and canonical row-count predicates, and wrote an audit object to each `import_jobs.result_summary`. It refreshed associated passports and aborted transactionally if any touched passport remained open.
- Read back the database after the migration: 49 imports contain `legacyRowCountReconciliation.status=RECONCILED_FROM_SOURCE_BOUND_PROOF`; all 49 related passports are `VERIFIED / READY / FULL`; unresolved reconciled reports = 0.
- Synchronized both generated migration-version records into tracked SQL files `supabase/migrations/20261010144953_reconcile_legacy_import_rowcount_from_source_proof.sql` and `supabase/migrations/20261010145143_reconcile_legacy_import_rowcount_from_source_proof.sql`. Both files are committed/read back from GitHub and include the transactional closure guard. The SQL is idempotent because already reconciled imports no longer match the all-zero-counter eligibility predicate.
- Updated `scripts/check-session-handoff-contract.mjs` so the required `ONE-PROGRAMMER-SESSION-MEMORY.md` is an explicitly allowed persistent handoff file, while retaining report-head ancestry and restricted governance-doc/archive coverage.

WHAT_IS_PROVEN
- Pre-write SELECT aggregate: 49 unique imports, 49 conflict-free row-count matches, 0 conflicts, quality score >=70, secure source record, and identical sourceHash/sourceFingerprint/fileHash/passportHash/snapshotHash.
- Supabase reported migration execution success. Post-write readback: `reconciled_import_jobs=49`.
- Passport readback: exactly 49 related passports are `VERIFIED / READY / FULL`; `unresolved_reconciled_reports=0`.
- Report Value Cohort passed on predecessor checkpoint [38061102673](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38061102673) after the data reconciliation. Quality [38061102377](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38061102377) and Product Build Gate [38061102647](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38061102647) also passed on that predecessor checkpoint.
- Exact-current-candidate workflows for `84c881eae999ae218b2cf6b448394cbdc73d0775` are pending/queued. Do not claim current-head build, browser, session-handoff, or backup/restore closure yet.
- Phase-F on an older docs head failed its runtime preview provenance guard because Netlify kept serving application SHA `8f610fef...` while the test required `e017b865...`; that run did not reach restore probes. This remains an outstanding exact-deployment test, not proof that the newly tracked migrations failed.
- Previous Full Product Browser E2E had a test wording mismatch; the assertion is corrected, but current-head authenticated upload-to-saved-readback/reload must still pass.

FIRST_ACTIVE_FAILURE
Current-head CI remains unverified. Outstanding gates are exact-head browser flow/readback, a current-SHA deployed preview for Phase-F, and clean restore with tracked schema/history. Historical cohort failure has been repaired in staging, but its current-head CI rerun remains queued.

ROOT_CAUSE
Legacy generic imports retained zero total/processed/valid/invalid counters after the application had already preserved matching source fingerprint, successful file security, completed render, analyzed quality, canonical commit ledger and canonical dataset rows. The passport refresh correctly required counters to match authoritative source-derived rows, so coverage remained PARTIAL. The corrective migration uses all independent corroborating evidence and never derives counts from filenames or guessed specialty.

NEXT_EXACT_ACTION
Consume the current-head Quality, Product Build Gate, Report Value Cohort, Full Product Browser E2E, Session Handoff Contract and Phase-F runs. Fix the first confirmed failure without relaxing evidence gates. Require an exact-deployed preview SHA before judging Phase-F. Then prove varied-format upload → complete general plus applicable specialist results → navigation/reload → saved readback with unchanged `reportJobId + sourceHash`.

---

