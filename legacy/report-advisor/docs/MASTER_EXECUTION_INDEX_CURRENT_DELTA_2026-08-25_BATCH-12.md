# Master Execution Index — Current Delta — Batch 12 — 2026-08-25

## New verified execution

### Tenant legacy consumer boundary
Added `scripts/check-tenant-legacy-consumers.mjs`.

Commit: `bb961aba1541df4ab3d42349774820132d783447`

It prevents new `COMPANY_ID` / `activeCompanyId` consumers from appearing outside the two documented compatibility boundaries:
- `src/pages/EntityPages.tsx`
- `src/lib/supabase.ts`

The existing Data Quality consumer therefore remains explicitly visible as a migration boundary rather than being falsely marked complete.

### Company configuration truth
The existing `scripts/check-company-config-truth.mjs` was verified and added to the canonical Quality workflow.

### Quality workflow
Updated `.github/workflows/quality.yml` to execute both truth/convergence guards.

Commit: `a36111a47b95e1a188dc524a057d79c011b42526`

## Status correction
No runtime status was promoted by this batch. These are static regression controls. Runtime evidence still requires an executable workflow job and logs/artifacts.

## Current open gaps
- Data Quality native RLS convergence.
- Live tenant isolation proof.
- Quality executable runtime evidence.
- Migration live drift/dependency proof.
- J/K/L runtime evidence.
- E/F/H/I live evidence.
- Production certification.

## Strategy
Use existing workflows as execution surfaces; do not rebuild already-present certification infrastructure. Apply small, source-complete edits only.

## Batch ledger
`docs/EXECUTION_LEDGER_2026-08-25_BATCH-12.md`