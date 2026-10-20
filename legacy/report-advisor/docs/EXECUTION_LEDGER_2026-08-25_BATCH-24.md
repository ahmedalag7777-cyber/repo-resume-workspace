# Execution Ledger — Batch 24

## Objective
Close the tenant-resolver lineage gap discovered during deep migration review and prevent the security gate from validating an obsolete resolver definition.

## Findings
- The migration directory contains multiple `CREATE OR REPLACE FUNCTION current_company_id()` definitions.
- `20260822200000_canonical_tenant_membership.sql` is an earlier resolver contract.
- `20260822212000_canonical_tenant_membership.sql` is the later resolver definition and therefore the effective schema definition when migrations are applied in filename order.
- The later resolver derives the tenant from `auth.uid()` + active + default membership and returns at most one company.
- The previous `check-tenant-security-contract.mjs` used `migrations.find(...)`, so it could validate the first historical resolver instead of the effective latest definition. This was a real verification defect.

## Implemented
- Added `scripts/check-tenant-resolver-lineage.mjs` as a dedicated lineage guard.
- Corrected `scripts/check-tenant-security-contract.mjs` to select the last resolver definition in migration order rather than the first.
- The security contract now requires the effective resolver to contain `auth.uid()`, `company_memberships`, `is_active`, `is_default`, and a bounded `SELECT cm.company_id ... LIMIT 1`.
- Existing permissive anonymous/authenticated tenant-policy checks remain enforced.
- Existing Import RPC fail-closed evidence remains required.

## Commits
- `daaecdc6a639074dcb7bbcdb88a1c25eb34e50ee` — added resolver-lineage guard.
- `5de9d7efec919fe71d4d5475cd7db6accd51dd28` — corrected security gate to inspect the latest resolver.
- `55e0c2785d69662c8db330a40b02325cf7a30b24` — corrected SQL syntax matching in the gate against the actual latest resolver.

## Evidence discipline
- Static contract: IMPLEMENTED.
- Latest resolver semantics: SOURCE-VERIFIED.
- Live database resolver: NOT PROVEN.
- Two-tenant runtime isolation: NOT PROVEN.
- Current-head CI execution: NOT PROVEN.
- Production certification: NOT CLAIMED.

## Next
1. Execute the corrected tenant security gate on the current HEAD.
2. Obtain live database evidence for the effective resolver and RLS.
3. Run two-tenant read/write isolation scenarios.
4. Continue migration dependency/runtime evidence and then return to current-head CI/typecheck/lint/build evidence.
