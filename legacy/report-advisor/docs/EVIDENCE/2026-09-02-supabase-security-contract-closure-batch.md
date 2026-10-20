# 2026-09-02 — Supabase Security Contract Closure Batch

## Lineage
- Repository parent boundary: `078fccf7e66cdc21cd63298deba36878eca814b0`
- Tested code boundary: `51267cc0cdfa074ce61d257e06f8333bb3a9364d`
- Target: `Report-Advisor-P0-2-Staging` / Supabase project `fnqbvfuwbdpwvhcgzksl`
- Scope: direct PostgreSQL security/RLS/function-privilege contract verification; no production mutation.

## Verified closures
1. Tenant policy coverage: all 72 tenant-scoped public tables with `company_id`/`tenant_id` have tenant-bound RLS coverage. `company_memberships` is intentionally bound to `auth.uid()` for self-membership visibility.
2. Unconditional tenant bypass scan: no tenant-scoped table has an unconditional `true` RLS policy. The only unconditional authenticated policy observed is `synonym_dictionary` read access, a shared dictionary without a tenant column.
3. Authenticated SECURITY DEFINER isolation: every authenticated-executable SECURITY DEFINER function inspected references `current_company_id()` or `auth.uid()`; none was found without user/tenant context enforcement.
4. Anonymous/public function exposure: the only function executable by `anon`/`public` is `normalize_import_key(text)`, non-definer and a pure normalization helper; no data-bearing or tenant-bearing RPC is publicly executable.
5. Decision workflow authorization: `create_decision_work_item`, `complete_decision_work_item`, `request_decision_approval`, `decide_approval`, `start_decision_work_item`, and `finalize_runtime_decision` enforce tenant context and expected approval/assignee/work-item state boundaries in their live definitions.
6. Outcome provenance authorization: `record_decision_outcome` and `record_recommendation_outcome` require tenant-local decision/recommendation identity plus tenant-local evidence snapshot provenance; malformed/foreign evidence is rejected by contract.
7. Default-tenant data invariant: the live membership dataset has exactly one active default membership for every observed user and no active user without a default membership.
8. No privilege mutation: no blanket EXECUTE revoke, RLS mutation, or production change was made.

## Current truth
- PostgreSQL 17.6
- Public tables: 78
- RLS: 78/78 enabled
- Tables with at least one policy: 78/78
- Policies: 147
- Tenant-scoped tables: 72
- Foreign keys: 127
- `ON DELETE CASCADE`: 87
- `ON UPDATE CASCADE`: 0

## Boundary
This closes the static/live database security contract audit for the inspected staging database. It does not prove authenticated browser E2E, live Tenant A/B through the deployed application, backup/restore, RPO/RTO, rollback, forward recovery, DR, or production certification.
