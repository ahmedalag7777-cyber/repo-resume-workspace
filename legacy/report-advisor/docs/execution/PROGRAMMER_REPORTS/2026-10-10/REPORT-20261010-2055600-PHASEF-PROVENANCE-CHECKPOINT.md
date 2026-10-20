## ARCHIVED EXECUTION REPORT — 2026-10-10T18:20:00+03:00 — source-bound legacy evidence closure and Phase-F provenance gate fix

SESSION HANDOFF = READY
REPORT_FOR_HEAD = 2055600a895c05ef8239b6be4014b121d5cea775
UPDATED_AT = 2026-10-10T18:20:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
APPLICATION_CODE_HEAD = 2055600a895c05ef8239b6be4014b121d5cea775
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO

WHAT_I_WAS_ASKED_TO_DO
Resume the existing product without rebuilding the intelligence core; ensure generic intelligence renders for arbitrary supported reports, specialized intelligence augments rather than replaces it, evidence stays source-bound, CI gates are meaningful, and every launch saves exact status.

WHAT_I_ACTUALLY_DID
- Shared header normalizer/specialty inference is committed and wired in both File Lab paths; regressions cover English and Arabic spaced headings plus generic headers that must not imply a specialty.
- Full Product Browser E2E trust wording assertion was fixed to recognize the UI's actual source-trust label “موثوق” while keeping evidence snapshot review/pending distinct.
- Added and tracked VOI request table restore-parity migrations and a schema-audit contract for table/index/RLS/tenant policy/grants/checks.
- Reconciled 49 legacy imports with counters stored as zero only when independent source-bound evidence matched exactly: rendered row count, file/security state, source fingerprint/hash, analyzed snapshot row count and quality, canonical commit count, and canonical dataset count. There were 49 unique candidates, 49 conflict-free and zero conflicting.
- Applied the gated migration in staging and refreshed the associated passports; post-write readback proves 49 audited imports, 49 related passports VERIFIED / READY / FULL, and zero unresolved reconciled reports. Each import’s result_summary.legacyRowCountReconciliation stores the proof and rule version.
- Tracked both observed Supabase migration history versions: 20261010144953_reconcile_legacy_import_rowcount_from_source_proof.sql and 20261010145143_reconcile_legacy_import_rowcount_from_source_proof.sql.
- Fixed Session Handoff Contract’s allow-list to include the required persistent session-memory file.
- Fixed Phase-F runtime code-equivalence boundary to permit ONE-PROGRAMMER-SESSION-MEMORY.md alongside docs/execution/* only. The companion contract asserts this rule. Code differences outside these governance paths continue to fail closed.

WHAT_IS_PROVEN
- Live database readback: reconciled import count = 49; matching passport statuses = 49 VERIFIED / READY / FULL; unresolved = 0.
- Report Value Cohort predecessor run 38061102673 passed after reconciliation. Predecessor Quality 38061102377 and Product Build Gate 38061102647 also passed. These are predecessor-head passes, not current-head passes.
- Prior Phase-F failure on head e017b865... showed RUNTIME_PROVENANCE_CODE_DRIFT=true because runtime preview stayed on older app SHA 8f610fef...; the test required later documentation SHA e017b865.... The earlier diff included real code edits, so that failure was valid then.
- Current code candidate 2055600a895c05ef8239b6be4014b121d5cea775 changes the provenance equivalence rule narrowly; exact-head current Quality/Product/browser/cohort/Phase-F workflows are queued or pending. Current-head success is NOT YET PROVEN.
- Netlify’s last observed page reported app source SHA 84c881e...; the new code commit 2055600a895c05ef8239b6be4014b121d5cea775 is deploying. Phase-F must not be judged until the preview’s reported SHA is current or the docs-only equivalence rule is proven to accept only governance-only deltas.

FIRST_ACTIVE_FAILURE
Current-head CI is not terminal. The outstanding gates are current-head typecheck/build/UI tests, authenticated Full Product Browser E2E, value cohort rerun, Session Handoff Contract, and Phase-F runtime/restore proof.

ROOT_CAUSE
Three unrelated defects were proven and addressed: malformed File Lab header normalization; a browser assertion conflating source trust with passport status; and zero-valued legacy import counters forcing valid source-backed reports into PARTIAL evidence coverage. A fourth CI problem was provenance semantics: Phase-F runtime accepted only docs under docs/execution/ as documentation-only, but the product's required session memory file lives at the repository root.

NEXT_EXACT_ACTION
Consume terminal runs for 2055600a895c05ef8239b6be4014b121d5cea775; fix the first genuine failure, not a queued run. Verify the latest Netlify preview’s provenance and Phase-F restore probe, then prove the same reportJobId/sourceHash through varied-format upload, full result display, navigation/reload and persisted readback. Keep PR #912 open until the current-head end-to-end and clean restore gates pass.

---

