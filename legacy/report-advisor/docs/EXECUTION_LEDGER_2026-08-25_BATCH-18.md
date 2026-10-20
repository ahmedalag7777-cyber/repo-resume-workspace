# Execution Ledger — Batch 18 — 2026-08-25

## Completed
- Added tenant-native Data Quality query boundary.
- Migrated `DataQualityPage` to that boundary.
- Removed UI-level `COMPANY_ID` dependency from `EntityPages.tsx`.
- Tightened the legacy consumer guard so only `src/lib/supabase.ts` may contain the transitional compatibility tokens.
- Recorded the work in the permanent execution index.

## Evidence level
`IMPLEMENTED / SOURCE-VERIFIED`

## Not yet certified
- GitHub Actions runtime result for this exact HEAD.
- Live two-tenant isolation test.
- Live migration drift test.
- Production certification.
- Removal of `COMPANY_ID` from `src/lib/supabase.ts`.

## Guardrail
Do not classify the compatibility owner as dead code until the guard passes in CI and runtime tenant isolation evidence confirms the canonical tenant context is enforced end-to-end.
