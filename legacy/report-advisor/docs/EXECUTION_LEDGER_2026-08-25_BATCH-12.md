# Execution Ledger — Batch 12 — 2026-08-25

## Objective
Strengthen the parallel execution model by turning two previously identified truth/convergence risks into permanent Quality gates without performing unsafe wholesale edits to incompletely retrieved application files.

## Implemented

### 1. Tenant legacy consumer boundary guard
Added `scripts/check-tenant-legacy-consumers.mjs`.

Commit: `bb961aba1541df4ab3d42349774820132d783447`

The guard scans source, scripts, and migrations for `COMPANY_ID` and `activeCompanyId` references. The two currently documented compatibility boundaries are explicitly allowlisted:
- `src/pages/EntityPages.tsx`
- `src/lib/supabase.ts`

Any new occurrence outside those boundaries fails the guard. This does not claim that the existing Data Quality consumer is fully converged; it prevents the legacy boundary from spreading.

### 2. Canonical Quality integration
Updated `.github/workflows/quality.yml` to execute:
- Tenant legacy consumer boundary
- Company configuration truth

Commit: `a36111a47b95e1a188dc524a057d79c011b42526`

### 3. Existing company truth guard verified
Confirmed `scripts/check-company-config-truth.mjs` exists and remains conservative: it rejects prohibited hard-coded company identity/configuration while allowing canonical tenant/profile plumbing.

## Important non-claims
- Data Quality native-RLS refactor is NOT complete.
- Tenant live isolation is NOT proven.
- Quality runtime success is NOT yet claimed for the new workflow revision.
- Production certification remains open.

## Execution strategy
This batch intentionally converts known risks into regression boundaries first. The next safe code change for Data Quality requires complete source context; no wholesale replacement is permitted from truncated retrieval.

## Next parallel fronts
1. Obtain complete Data Quality source context and refactor only the four legacy filters to RLS-native reads.
2. Execute the updated Quality workflow and inspect actual job steps/logs.
3. Execute existing runner/runtime certification workflows rather than rebuilding them.
4. Continue migration dependency/object mapping and live drift evidence.
5. Continue critical UI and J/K/L/M/E/F/H/I runtime evidence.

## Evidence rule
A gate being present is implementation evidence only. Runtime and production statuses remain unchanged until executable evidence is observed.