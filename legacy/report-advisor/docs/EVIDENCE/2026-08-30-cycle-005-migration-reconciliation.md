# CYCLE-005 — live migration reconciliation

Start main SHA: `76f8f6bc174838dcd7ba95c17d2794a7816b1e14`
Branch: `cycle-005/migration-reconciliation-rebased`

PR #109 was superseded/rebased after CYCLE-004 merged; no migration work was discarded.

## Finding
PR #98's forensic matrix identified 21 production-applied migration versions after the 2026-08-29 baseline. Seven were recovered/reconstructed into CYCLE-003; fourteen remained without exact historical source.

## Actual work
CYCLE-005 reconstructs the observed live financial/decision invariants from the current Supabase catalog in `20260830040000_reconcile_live_financial_decision_invariants.sql`.

Coverage includes invoice/item nonnegative and currency invariants, payment positivity/currency/date/direction, inventory quantity/cost/temporal rules, decision confidence/evidence/approval/execution rules, approval/work-item/outcome temporal/evidence rules, and recommendation evidence rules.

`20260830040001_verify_reconstructed_invariants.sql` is deliberately fail-closed: if a required table or constraint is missing after reconstruction, migration replay fails rather than silently degrading coverage.

## Provenance
This is **RECONSTRUCTED FROM LIVE STATE**, not claimed byte-for-byte historical recovery. Exact historical equivalence remains un-certified until fresh replay and independent comparison are complete.
