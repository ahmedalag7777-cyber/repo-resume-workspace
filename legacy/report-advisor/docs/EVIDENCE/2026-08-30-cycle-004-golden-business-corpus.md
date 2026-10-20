# CYCLE-004 — deterministic Golden Business Corpus

Start main SHA: `20f352bf8291653ab21f8325b98a3d6e328a9acc`
Branch: `cycle-004/golden-business-corpus-rebased`
PR: #108

## Purpose
Create a reusable, deterministic synthetic business corpus that can exercise BI truth, reconciliation, reports, decisions, AI grounding, exports, and tenant isolation without pretending that fixture evidence is live production business evidence.

## Coverage
- Two tenants with deliberately disjoint customer, supplier, product, sales, purchase, inventory, and payment records.
- Returns and net-sales semantics.
- Receivables and inventory valuation expectations.
- Zero-stock detection.
- Duplicate and revised-record adversarial cases.
- Cross-tenant reference rejection cases.
- Explicit `NULL`/invalid quantity rule: reject or quarantine; never coerce to zero.

## Expected truth
Tenant A: gross sales 1200, returns 100, net sales 1100, purchases 900, inventory value 200, payments 300, receivables 800, estimated COGS 800, estimated gross profit 300, zero-stock SKU A-002.

Tenant B: gross sales 640, returns 0, net sales 640, purchases 440, inventory value 110, payments 100, receivables 540.

## Verification
`node scripts/business-golden-corpus-contract.mjs` asserts the fixture invariants and adversarial expectations. The existing `batch-integrity-guards` workflow executes this contract alongside the existing workflow/import/lifecycle guards.

## Evidence classification
This is **GOLDEN FIXTURE EVIDENCE**, not live production business evidence. It closes a deterministic test-data gap but does not claim real-customer reconciliation or production business acceptance.
