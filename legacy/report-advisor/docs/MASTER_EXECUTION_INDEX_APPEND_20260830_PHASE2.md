# Master Execution Index — Append 2026-08-30 — Phase 2 Security Closure

## Exact execution context
- Base HEAD: `3a0dc196a3d82144a61782ea1da55cedb33717c0`
- Branch: `phase-2-security-companies-closure`
- Purpose: Phase 2 tenant/security closure without rewriting historical index state.

## Finding
Live Supabase security inspection found `public.companies` had RLS enabled but **zero policies** and client roles retained broad table privileges. This left the tenant registry without an explicit row-authorization contract and exposed unnecessary client mutation privileges.

## First implementation attack and correction
The first policy draft used `public.current_company_id()` directly inside the RLS predicate. An authenticated-role runtime test correctly rejected that design because `current_company_id()` itself was not executable by `authenticated`.

This was treated as a real test-discovered defect, not suppressed.

The policy was corrected to use the already-protected membership boundary directly:

`EXISTS (SELECT 1 FROM public.company_memberships membership WHERE membership.company_id = companies.id AND membership.user_id = auth.uid())`

## Second discovery: canonical tenant helper was itself under-granted
A live catalog scan found multiple authenticated functions call `public.current_company_id()`, while the helper had `EXECUTE=false` for `authenticated`. This would break the Phase-1 browser tenant resolver and authenticated reporting/import functions at runtime.

Implemented migration:
`supabase/migrations/20260830172000_current_company_id_execute_contract.sql`

- `anon EXECUTE = false`
- `authenticated EXECUTE = true`

This restores the intended canonical tenant authority without exposing it anonymously.

## Final companies fix
Migration: `supabase/migrations/20260830170000_companies_tenant_boundary_hardening.sql`

- RLS remains enabled.
- `anon`: all table privileges revoked.
- `authenticated`: INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER revoked.
- `authenticated`: SELECT granted only through the membership-backed RLS policy `companies_select_current_tenant`.
- No anonymous policy and no client mutation policy are created.
- The RLS policy does not depend on EXECUTE privilege for `current_company_id()`.

## Live verification
Applied to authoritative Supabase project `fnqbvfuwbdpwvhcgzksl`.

Verified:
- `anon_select = false`
- `auth_select = true`
- `auth_insert = false`
- `auth_update = false`
- `auth_delete = false`
- `current_company_id(): anon_exec=false, auth_exec=true`
- authenticated user sees exactly one company, its membership company.

## Adversarial cross-tenant attacks
1. Inside a transaction, a synthetic foreign company row was inserted, the session switched to `authenticated`, and the JWT subject was bound to an existing test membership.
   - `foreign_rows_visible = 0`
   - `visible_total = 1`
   - transaction rolled back.

2. An authenticated call to `cash_liquidity_snapshot()` with a foreign company id was attempted.
   - Result: `TENANT_CONTEXT_MISMATCH`
   - No cross-tenant data returned.
   - transaction rolled back.

3. After the tenant helper grant, an authenticated call to `current_company_id()` resolved the expected membership company, and `cash_liquidity_snapshot()` executed successfully for the authorized tenant.

## SECURITY DEFINER surface
A live catalog scan found all `SECURITY DEFINER` functions have fixed `search_path=public`, no anonymous EXECUTE, and every authenticated-executable privileged function is bound to `current_company_id()` or `auth.uid()`.

## All public-table baseline
Live catalog query returned no public table with RLS disabled or with zero policies.

## Test hardening
Added:
- `scripts/check-phase2-security-closure.mjs`
- `scripts/check-phase2-security-definer-surface.mjs`
- `.github/workflows/phase-2-security-closure.yml`

The tests strip SQL comments and include adversarial decoy checks so commented-out grants/policies cannot satisfy the gate.

## Cycle continuation — certification RPC exposure
Fresh live advisor scan discovered that `public.can_release_production_certification(text)` remained executable by `PUBLIC`, `anon`, and `authenticated` despite being an internal release-decision boundary.

Live remediation applied:
`REVOKE EXECUTE ON FUNCTION public.can_release_production_certification(text) FROM PUBLIC, anon, authenticated;`

Live verification:
- `anon EXECUTE = false`
- `authenticated EXECUTE = false`
- `service_role EXECUTE = true`

Repository parity added:
- `supabase/migrations/20260830172500_revoke_certification_rpc_execute.sql`
- `scripts/check-certification-rpc-exposure.mjs`
- `.github/workflows/certification-rpc-exposure.yml`

The certification RPC is now deliberately unavailable through the normal PostgREST client roles while remaining available to the privileged service boundary.

## Cycle continuation — work-item lifecycle attack
Adversarial review of `complete_decision_work_item()` found a genuine state-machine gap: the previous implementation rejected `COMPLETED`, but did not reject `BLOCKED` or `CANCELLED` before producing an outcome and marking the decision `EXECUTED`.

This violated the lifecycle truth boundary:
`BLOCKED/CANCELLED != EXECUTABLE`.

Implemented live migration:
`20260830173000_harden_work_item_terminal_transition`

New fail-closed rule:
- only `OPEN` and `IN_PROGRESS` work items may complete;
- `COMPLETED` returns `WORK_ITEM_ALREADY_COMPLETED`;
- `BLOCKED` and `CANCELLED` return `WORK_ITEM_NOT_ACTIONABLE`;
- anonymous execution is explicitly revoked.

Live verification after migration:
- `anon_execute = false`
- `authenticated_execute = true`
- `terminal_guard_present = true`

Repository parity added:
- `supabase/migrations/20260830173000_harden_work_item_terminal_transition.sql`
- `scripts/check-work-item-terminal-guard.mjs`
- `.github/workflows/work-item-terminal-guard.yml`

## Cycle continuation — direct decision-outcome writer bypass
A fresh privilege scan found `authenticated` still had direct `INSERT` on `public.decision_outcomes`, even though the canonical `record_decision_outcome()` RPC enforces tenant provenance, evidence identity, valid outcome labels, and duplicate protection.

This was a real truth-integrity bypass: tenant RLS alone could not enforce the lifecycle/provenance contract against direct table writes.

Implemented live remediation:
`harden_decision_outcomes_direct_dml`

- authenticated INSERT/UPDATE/DELETE/TRUNCATE = false
- authenticated SELECT = true
- canonical `record_decision_outcome()` remains the controlled writer.

Live verification:
`INSERT=false, UPDATE=false, DELETE=false, TRUNCATE=false, SELECT=true`.

## Cycle continuation — audit forgery boundary
The same fresh privilege scan found `authenticated` could directly INSERT into `audit_logs`. Although UPDATE/DELETE/TRUNCATE were already blocked, direct inserts could forge audit history and therefore weaken evidence provenance.

Repository/runtime remediation:
`REVOKE INSERT ON TABLE public.audit_logs FROM authenticated;`

Live verification:
- INSERT = false
- UPDATE = false
- DELETE = false
- TRUNCATE = false

The existing `SECURITY DEFINER` audit trigger remains the controlled writer for decision-runtime audit entries.

Repository parity added:
- `supabase/migrations/20260830235910_harden_direct_truth_writers.sql`
- `scripts/check-direct-truth-writers.mjs`
- `.github/workflows/direct-truth-writers.yml`

## Cycle continuation — certification evidence writer bypass
A fresh security rotation found four proof-bearing tables still directly writable by `authenticated` despite being used as certification/rollback/backup evidence:
- `trust_certifications`
- `autonomy_certification_runs`
- `backup_verification_runs`
- `autonomy_rollback_drills`

Tenant RLS alone did not prevent a tenant user from manufacturing or rewriting proof artifacts. The canonical read/validation boundary therefore needed a write restriction.

Implemented live remediation:
`harden_certification_evidence_writer_boundaries`

For all four tables:
- authenticated INSERT = false
- authenticated UPDATE = false
- authenticated DELETE = false
- authenticated TRUNCATE = false
- authenticated SELECT = true

Live verification confirmed all four DML classes are denied to `authenticated` across all four proof tables.

Repository parity added:
- `supabase/migrations/20260830235920_harden_certification_evidence_writer_boundaries.sql`
- `scripts/check-certification-evidence-writer-boundary.mjs`
- `.github/workflows/certification-evidence-writer-boundary.yml`

## Current status
`SECURITY FRONT ADVANCED / DECISION TRUTH WRITERS CLOSED / AUDIT FORGERY CLOSED / CERTIFICATION PROOF WRITERS CLOSED / FRESH CI + EXACT-HEAD VERIFICATION REQUIRED`

Vercel remains a separate external deployment blocker and is not used as evidence of product correctness.
