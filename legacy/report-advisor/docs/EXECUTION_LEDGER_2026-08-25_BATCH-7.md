# Execution Ledger — 2026-08-25 — Batch 7

## Objective
Continue the current P0 tenant-convergence stage, close an independent P1 truthfulness issue, complete owner profile controls, and make the remaining legacy tenant consumers safe without introducing a second tenant architecture.

## Pre-change discovery
- `src/lib/supabase.ts` already uses persistent Supabase sessions and has no demo-company fallback.
- `src/components/AuthGate.tsx` and `src/App.tsx` already provide the authenticated application boundary.
- `supabase/migrations/20260822200000_canonical_tenant_membership.sql` already defines `company_memberships` and `public.current_company_id()` as the database tenant authority.
- `src/lib/queries.ts` still imported a removed/static `COMPANY_ID` surface and applied frontend tenant filters. This was a real convergence gap because the database is authoritative.
- `src/components/Header.tsx` displayed `النظام يعمل` unconditionally, which was a truthfulness/observability gap.
- `src/pages/EntityPages.tsx` contains a legacy Data Quality `COMPANY_ID` consumer. Rather than inventing a second tenant system, this consumer is now supplied only from canonical `current_company_id()` resolution before protected UI renders.

## Changes
### 1. Dashboard query tenant convergence
Commit: `cc8550b273da48dc1914aa5380c488882676f0cb`

Changed `src/lib/queries.ts` so canonical dashboard reads no longer depend on a frontend static tenant filter. Tenant authorization/filtering is delegated to authenticated RLS/current_company_id at the database boundary. `sale_items` remains indirectly scoped through its parent `sales_invoices` IDs.

### 2. Truthful Header health state
Commit: `5393c87616b57d9697d9b16c290e37faee15a201`

Changed `src/components/Header.tsx` to perform a real authenticated session check and database round-trip through `current_company_id()` every 60 seconds. UI states are checking/healthy/degraded/offline instead of unconditional success.

### 3. Owner-editable profile/display name
Commit: `a418b38bd364992a5e17784f2353e68b10d8861d`

Added `src/pages/ProfileSettingsPage.tsx`. The page reads the authenticated user and updates `user_metadata.full_name` through `supabase.auth.updateUser`. No hard-coded email is introduced.

### 4. Profile route/navigation
Commits:
- `5fe6312dcda49e609e7d7895126966fe113a3397` — `/settings/profile` route and lazy import.
- `89cecdaccf8e75911c4db41ce8edd34b1e5712fc` — Sidebar navigation entry.

### 5. Regression coverage
Commit: `2253cd2fba29e79d1790b6764d0eec6384474d10`, then extended by `786b0705f8ff43a85840fc81956ef19d0393f519`.

The convergence guard now checks canonical tenant hydration, fail-closed tenant gating, profile settings, truthful health states, and canonical dashboard query behavior.

### 6. Canonical tenant hydration for legacy consumers
Commit: `a460808a8079a3b68586a12ef7e687833f5c499b`

`src/lib/supabase.ts` now exposes a transitional compatibility value populated only by the authenticated `current_company_id()` RPC. There is no demo/default company. New code should continue to rely directly on RLS and avoid this compatibility value.

### 7. Fail-closed protected UI
Commits:
- `a5e469216ff009de5313c8f9dd5e2c29c78d8a2b`
- import correction: same file finalized in `a5e469216ff009de5313c8f9dd5e2c29c78d8a2b`

`AuthGate` now resolves the canonical company before rendering protected UI. Missing or ambiguous membership renders a tenant-missing state and prevents protected data from appearing.

## Reference updates
- `3fb30629493a2a8b5a84aefc9519f4314f018cd1` — latest execution index updated.
- `ec4f89ebd7f5ed163776c90f008cced5102ddf67` — Batch 7 current-delta supplement.

## Evidence status
No production/runtime certification is claimed from static commits. Current commit status has no reported checks. Prior CI failures were pre-step runner/bootstrap failures. Live tenant-isolation proof remains open.

## Remaining work
1. Execute the Auth/Tenant convergence gate and obtain runtime evidence.
2. Add/execute health-state regression coverage in CI.
3. Prove two-company isolation and ambiguous-membership fail-closed behavior.
4. Continue migration/schema/RLS/index dependency mapping.
5. Trace critical UI flows end-to-end.
6. Return to J/K/L/M and E/F/H/I runtime evidence.
