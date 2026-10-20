# Canonical Truth Boundary — Owner-Level Gap Ledger

Baseline scope intentionally excludes previously closed fronts: ZIP traversal, document extraction security, Security/RLS, CI topology, and decision authorization. Revisit only on new finding, affected SHA, environment change, or regression.

## Chain reviewed

`Evidence → Lineage → Import → Reconciliation → Canonical Record → Server-side Aggregation → KPI → Report`

## Findings

### G1 — Import crossed directly into canonical write
- Root cause: `processFolderFiles()` validated required fields and then called `commitImportBatch()` without a reconciliation state or provenance contract.
- Risk: successful ingestion could become canonical truth without explicit reconciliation.
- Fix: `reconcileForCanonical()` is now mandatory before `commitImportBatch()`.
- Regression: conflicting same-identity rows are rejected.
- Status: CLOSED.

### G2 — Partial/failed extraction could still continue into canonical import
- Root cause: extraction result was used only as a warning; the import path continued for `partial` and `failed` extraction.
- Risk: canonical records could be created without complete extraction evidence.
- Fix: canonical import is fail-closed unless extraction status is `succeeded`.
- Status: CLOSED.

### G3 — Canonical commit accepted unproven rows
- Root cause: `commitImportBatch()` accepted a plain row with no runtime provenance or reconciliation proof.
- Risk: callers could bypass the intended evidence/reconciliation boundary.
- Fix: commit now accepts `ReconciledCanonicalImportRow` and performs runtime tenant/provenance/reconciliation assertions.
- Status: CLOSED.

### G4 — Conflicting evidence had no canonical import conflict gate
- Root cause: duplicate canonical identities inside one import chunk were not reconciled before write.
- Risk: iteration order could silently determine truth.
- Fix: same canonical identity + different critical payload is rejected as `CONFLICTING_EVIDENCE_FOR_SAME_CANONICAL_IDENTITY`.
- Status: CLOSED.

### G5 — Provenance/lineage was not attached to the canonical import contract
- Root cause: import rows carried data only.
- Risk: canonical writes could not be proven back to tenant, source, source hash, evidence identity, and lineage at the application boundary.
- Fix: every reconciled row carries tenant/source/sourceHash/sourceDocumentId/evidenceId/lineageId and the commit boundary validates all of them.
- Status: CLOSED.

### G6 — Profitability aggregation silently treated missing cost evidence as zero
- Root cause: `get_profitability_snapshot()` used `coalesce(sum(si.quantity * si.cost_price), 0)` per invoice, so an invoice with no sale items could contribute zero cost instead of insufficient evidence.
- Risk: a report could present a numerically valid-looking cost/profit result without cost provenance.
- Fix: missing sale-item evidence is now classified as `MISSING_COST_EVIDENCE`; cost aggregation uses a non-coalesced sum and the snapshot becomes `INSUFFICIENT_DATA` whenever evidence is incomplete.
- Adversarial regression: explicit missing-item guard, no cost `COALESCE`, and report fail-closed rendering.
- Status: CLOSED in the capability branch pending fresh CI.

## Verified downstream boundary

- Dashboard KPIs are retrieved through `get_dashboard_snapshot` rather than browser-side aggregation.
- Profitability report retrieves `get_profitability_snapshot` and renders the server snapshot directly.
- No client-array reconstruction finding was opened in this pass.

## Next front

**Canonical Aggregation → KPI → Report** continues with the remaining aggregation families: dashboard trend/category/aging and secondary KPI snapshots. The next check is targeted only at semantic `UNKNOWN` / `INSUFFICIENT_DATA` handling and conflicting/partial evidence—not a repeat of the import or provenance closure.

This ledger is a closure record, not an invitation to re-audit closed findings.
