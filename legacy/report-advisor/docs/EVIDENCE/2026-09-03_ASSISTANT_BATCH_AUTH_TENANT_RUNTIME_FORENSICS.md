# Assistant-First Batch — Auth/Tenant/Runtime Forensics

Date: 2026-09-03
Code/test candidate: `5dbf20f4f376896a58f9e8110b9fc813b5069967`
Repository observation: `main` currently contains later documentation/UI commits; this evidence is explicitly bound to the candidate SHA above and is not promoted across the exact-SHA boundary.

## Scope

Assistant-executable checks completed without owner credentials or secrets:

1. Supabase security advisor review.
2. SECURITY DEFINER inventory and EXECUTE-grant review.
3. Tenant membership/default-context review.
4. RLS coverage review.
5. Storage policy review and bucket-state review.
6. Realtime publication-state review.
7. Authenticated-role RLS adversarial checks for two isolated tenant contexts.
8. SECURITY DEFINER cross-tenant mutation rejection checks.
9. Receivables SECURITY DEFINER tenant scoping checks.
10. Production deployment identity/runtime/error review.

## Live Staging Results

- Public tables: 78; RLS enabled: 78; RLS disabled: 0.
- Public policies: 147; policies targeting `anon`: 0; policies targeting `public`: 0.
- Company memberships: 2 users across 2 companies; all 2 memberships active and default.
- Each user has exactly one active default membership.
- `current_company_id()` is SECURITY DEFINER with locked `pg_catalog` search path and resolves only from active/default membership.
- Unknown authenticated subject resolves to NULL (`fail_closed_without_membership=true`).
- Tenant A session context cannot see Tenant B product rows: `visible_other_company=0`.
- Tenant B session context cannot see Tenant A product rows: `visible_other_company=0`.
- `get_receivables_report_page(0,100)` under Tenant A returned total_rows=1 and one row; Tenant B returned total_rows=2 and two rows, matching tenant-scoped source data.
- Tenant A calling `mark_alert_read()` against a Tenant B alert was rejected with `ALERT_NOT_FOUND_OR_FORBIDDEN`.
- Tenant A calling `link_recommendation_to_decision()` using Tenant B objects was rejected with `RECOMMENDATION_NOT_FOUND_OR_FORBIDDEN`.
- Storage has four authenticated tenant/path/owner-aware policies (SELECT/INSERT/UPDATE/DELETE), but no storage bucket was present at audit time; therefore storage runtime remains UNPROVEN and no speculative bucket was created.
- `supabase_realtime` currently has no published tables; Realtime runtime evidence remains UNPROVEN.

## Production Runtime

Deployment `dpl_5quRUVs6BZwSRTbhcvZQySGGm8mG` is READY and reports Git commit SHA `5dbf20f4f376896a58f9e8110b9fc813b5069967`, target `production`, with alias `report-advisor.vercel.app`.

Production root returned HTTP 200 with Arabic RTL HTML and current branding `الأغبري`. No Vercel runtime error clusters were found in the selected 24-hour window.

This proves deployment/runtime availability only. It does not certify authenticated E2E, live Tenant A/B browser isolation, Storage/RealtIme runtime, backup/restore, RPO/RTO, rollback, DR, or production binding.

## Security Advisor Finding — Not Mutated

Supabase security advisor currently reports the expected class of `authenticated_security_definer_function_executable` warnings for intentionally exposed authenticated RPCs, plus `auth_leaked_password_protection` disabled. The exposed functions inspected in this batch contain tenant/user guards and use locked search paths. No blanket EXECUTE revocation was applied because that could break intended product RPCs and would be an unsafe mutation without contract-level role authorization.

## Evidence Integrity

- No secrets were collected or stored.
- No production mutation, restore, rollback, redeploy, alias mutation, or credential change was performed.
- No Candidate SHA change was made.
- Negative-path failures were treated as expected security evidence, not product failures.
