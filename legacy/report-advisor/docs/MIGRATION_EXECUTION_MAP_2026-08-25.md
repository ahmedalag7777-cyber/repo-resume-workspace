# Migration Execution Map — 2026-08-25

## Purpose
Permanent inventory of the migration chain discovered from the repository, used to prevent duplicate work and to separate static ordering evidence from live database evidence.

## Evidence rule
The presence of a migration file proves repository implementation only. It does not prove that the migration exists in the live database, that later migrations applied successfully, or that the resulting schema matches production.

## Ordered migration chain currently discovered

### Foundation
1. `20260817182847_01_core_schema.sql` — core schema
2. `20260817185322_02_file_intelligence_schema.sql` — file intelligence schema

### Import foundation / analytics
3. `20260819200000_import_engine_rpcs.sql`
4. `20260819203000_import_engine_jobs.sql`
5. `20260819210000_executive_metrics.sql`
6. `20260923014833_inventory_demand_liquidity.sql` (resequenced to eliminate duplicate migration version)
7. `20260819230000_alternative_item_groups.sql`

### Security / tenant / import hardening
8. `20260822180000_security_hardening_imports.sql`
9. `20260822190000_file_intelligence_anon_lockdown.sql`
10. `20260822200000_canonical_tenant_membership.sql`
11. `20260822200000_import_lineage_idempotency.sql`
12. `20260822201000_import_rpc_fail_closed.sql`
13. `20260822203000_import_lineage_tenant_integrity.sql`
14. `20260822203000_import_tenant_integrity_hardening.sql`
15. `20260822210000_import_rpc_fail_closed.sql`
16. `20260822212000_canonical_tenant_membership.sql`
17. `20260822213000_import_rpc_tenant_context.sql`
18. `20260822220000_import_engine_unification.sql`
19. `20260822221000_import_job_rows_rls.sql`
20. `20260822222000_import_product_business_key.sql`
21. `20260822223000_import_business_key_guard.sql`

### Global tenant / import execution hardening
22. `20260823000000_tenant_rls_global_hardening.sql`
23. `20260823010000_import_rpc_canonical_tenant.sql`
24. `20260823020000_import_business_key_enforcement.sql`
25. `20260823021000_import_upsert_concurrency_safe.sql`
26. `20260823070000_import_entity_rpcs.sql`
27. `20260823090000_import_customer_invoice_rpcs.sql`

### Report execution / SaaS / decision intelligence
28. `20260824190000_report_execution_runtime.sql`
29. `20260825000000_entitlements_usage_billing.sql`
30. `20260825030000_decision_outcome_feedback.sql`
31. `20260825050000_operational_resilience_trust.sql`
32. `20260825060000_release_evidence_manifest.sql`
33. `20260825070000_release_evidence_manifest.sql`
34. `20260825080000_release_evidence_hardening.sql`
35. `20260825090000_continuous_trust_autonomous_ops.sql`
36. `20260825100000_autonomous_governance_business_intelligence.sql`
37. `20260825110000_governance_intelligence_hardening.sql`
38. `20260825110000_watched_report_folders.sql`
39. `20260825120000_business_control_plane.sql`

### Production intelligence / runtime closure / certification
40. `20260825130000_phase_k_production_intelligence.sql`
41. `20260825140000_phase_l_runtime_cockpit.sql`
42. `20260825142000_phase_kl_runtime_closure.sql`
43. `20260825150000_phase_m_certification_bundle.sql`
44. `20260825153000_runtime_lease_hardening.sql`

## Important observations

### 1. Same timestamp does not mean same migration
Several migrations share timestamps but have different names and therefore represent distinct files. They must not be deduplicated merely because their timestamp prefix matches.

### 2. Tenant hardening is layered
The repository contains multiple successive tenant/import hardening migrations, including canonical tenant membership, global tenant RLS, RPC tenant context, fail-closed RPCs, and import tenant integrity. This should be analyzed as a dependency chain, not replaced with one new migration.

### 3. Import engine is heavily evolved
The import subsystem has separate migrations for RPCs, jobs, lineage/idempotency, fail-closed behavior, tenant context, unification, row RLS, business keys, concurrency safety, entity RPCs, and customer/invoice RPCs. This is strong evidence that the correct next step is dependency verification and runtime execution, not rebuilding the import engine.

### 4. Certification infrastructure is represented in the schema
The latest migrations include runtime cockpit, K/L closure, M certification, release evidence, continuous trust, governance intelligence, and runtime lease hardening. These must be checked against the corresponding workflows and runtime artifacts.

## Current evidence status
- Repository migration inventory: INVENTORIED
- Static migration schema audit: GATED
- Dependency/order correctness: REVIEW REQUIRED
- Live migration application state: NOT PROVEN
- Live schema drift: NOT PROVEN
- Production certification: BLOCKED until runtime evidence exists

## Next execution targets
1. Parse every migration for CREATE/ALTER/DROP/INDEX/POLICY/TRIGGER/FUNCTION references and produce a dependency graph.
2. Detect duplicate/overlapping object definitions across migrations, distinguishing intentional `CREATE OR REPLACE` from conflicting definitions.
3. Compare migration order with application consumers and certification workflows.
4. When live DB credentials/environment are available, compare the applied migration state and schema catalog against this map.
5. Record all findings in the Master Execution Index and the next append-only ledger.
