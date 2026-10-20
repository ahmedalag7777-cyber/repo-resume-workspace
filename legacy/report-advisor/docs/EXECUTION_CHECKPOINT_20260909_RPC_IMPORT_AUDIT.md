# Execution Checkpoint — RPC / Import Audit

Date: 2026-09-09

## Exact source boundary

- Main HEAD at completion of this checkpoint: `407b8a5718c8fb237f8d18962ce078b3b215e1ad`.
- Previous source baseline: `0eabfd739bc75fef2e51be1b051d9da95abde072`.
- Frozen release candidates were not modified.

## P0 — RPC contract audit

### Confirmed live Staging contracts

- `get_dashboard_snapshot(integer,date)` exists.
- `get_dashboard_intelligence(integer)` exists.
- Import RPCs exist with current canonical signatures, including:
  - `import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,boolean,text)`
  - `import_upsert_customer(uuid,text,text,text,text,text,numeric,integer,text)`
  - `import_upsert_sales_invoice(uuid,text,date,uuid,text,numeric,numeric,numeric,numeric,text,text)`
  - `import_commit_batch(uuid,text,jsonb,text)`
  - `import_create_job(uuid,text,integer)`
  - `import_update_job_progress(uuid,integer,integer,integer,integer,text)`
  - `import_finish_job(uuid,text,jsonb,text)`

### Defect found and fixed

`src/lib/dashboard-canonical.ts` called `get_dashboard_top_entities`, but the live Staging function inventory had no such function. The authoritative `get_dashboard_snapshot` already returns `topCustomers` and `topProducts`, so the secondary RPC was both unnecessary and a real 404 risk.

Fix: removed the secondary `get_dashboard_top_entities` call and restored top-entity consumption directly from the canonical snapshot.

Commits:
- `17f36ad2649c9764230cb3af7750eab97909e135` — dashboard RPC fix.
- `330f128f8c7bee3e8937821b993bb31a03e775f9` — regression contract guard.

## P1 — Import / reconciliation audit

The canonical import caller uses named arguments for `import_commit_batch`, including `p_company_id`, `p_entity_type`, `p_rows`, and `p_null_policy`; the live invoice RPC has the required `p_customer_name` 11-argument contract.

A source-level reconciliation defect was also found: batch deduplication compared raw business keys while the database canonicalizes import keys with lower-case + trim + whitespace removal. This allowed differently formatted keys in one batch to reach the write boundary as separate rows.

Fix: reconciliation identity now mirrors `public.normalize_import_key()` semantics before conflict detection.

Commits:
- `0feb731d77eec829d1c363a6091741217f6aeb4c` — regression tests for normalized duplicate identities.
- `407b8a5718c8fb237f8d18962ce078b3b215e1ad` — normalization fix.

## Security boundary

No tenant guard, `current_company_id()`, RLS policy, SECURITY DEFINER boundary, or authenticated A/B certification state was weakened or changed.

`TENANT_CONTEXT_MISMATCH` remains a fail-closed security result.

## Verification boundary

- Live DB contract verification was performed against Staging.
- Repository regression guards were added for both discovered defects.
- GitHub status for the final commit currently has no reported status entries; this is not treated as a test PASS.
- Browser-held Authenticated A/B, production runtime, backup/restore, rollback, and other operational certification gates remain NOT PROVEN.
