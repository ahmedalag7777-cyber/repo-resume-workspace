# Supabase Live Truth Sweep — 2026-09-02

## Lineage
- Date: 2026-09-02
- Repository code/test boundary inspected: `51267cc0cdfa074ce61d257e06f8333bb3a9364d`
- Repository/index synchronization boundary observed: `982ec1e4ce099220614534a64c1ded064c01bda3`
- Target: Report-Advisor-P0-2-Staging
- Purpose: direct database truth audit; migrations alone are insufficient.

## Verified database state
- PostgreSQL: 17.6
- Public base tables: 78
- Public tables with RLS enabled: 78/78
- Public tables with at least one RLS policy: 78/78
- RLS policies: 147
- Tenant-scoped tables containing `company_id` or `tenant_id`: 72
- Foreign keys in public schema: 127
- Foreign keys with ON DELETE CASCADE: 87
- Foreign keys with ON UPDATE CASCADE: 0

## Verified runtime contract presence
- Dashboard RPCs inspected and present in the database, including `get_dashboard_intelligence` and `get_dashboard_snapshot`.
- Decision / recommendation / outcome and report-execution RPC families are present.
- Security-definer functions were enumerated from `pg_proc`; the inspected functions use `SET search_path TO 'pg_catalog'` and tenant/user context checks where applicable.
- No privilege mutation was performed from this sweep because several authenticated RPCs are application-facing and removing EXECUTE without contract verification could create a real regression.

## Security / performance findings
- Security-definer inventory requires contract-level review of authenticated EXECUTE grants before any revoke. Discovery alone is not closure.
- Performance Advisor currently reports unused indexes. No index was deleted solely to improve Advisor metrics; index removal requires query/contract evidence.

## Current data truth
- companies: 2
- company_memberships: 2
- customers: 3
- products: 4
- categories: 2
- recommendations: 1
- decision_outcomes: 1
- file_records: 0
- import_jobs: 0
- report_execution_jobs: 0

## Classification
- DB/RLS baseline: VERIFIED in Staging.
- RPC existence baseline: VERIFIED in Staging.
- Live authenticated E2E: UNPROVEN.
- Live Tenant A/B isolation: UNPROVEN.
- Backup/Restore/RPO/RTO: UNPROVEN.
- Rollback/Forward/DR: UNPROVEN.
- Production certification: BLOCKED.

## Next action
Continue actionable repository/database contract closure in parallel with external E1–E8 preparation. Any mutation must create a new exact-SHA boundary and require fresh targeted/adversarial/regression/rescan evidence.
