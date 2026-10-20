# RCA — `get_dashboard_top_entities` Production 404/PGRST202

**Date:** 2026-09-02  
**Exact code SHA:** `ec6eb4cce7803af8e94697adfa6d9308f69a9ee2`  
**Parent code SHA:** `6410f161668572fbf9a913529456b3b2f1d1821d`

## Incident
Production Dashboard previously requested `POST /rest/v1/rpc/get_dashboard_top_entities` with `{}` and received HTTP 404 / `PGRST202`.

## Root cause
**FRONTEND RPC CONTRACT DRIFT.**

Historical lineage established that commit `329167631a76c63fcd486297d36c22fe0a3e9965` introduced a secondary `get_dashboard_top_entities` call into `fetchDashboardSnapshot()`. The canonical `get_dashboard_snapshot` RPC already returned `topCustomers` and `topProducts`, while Production had no `get_dashboard_top_entities` function in `pg_proc`.

Therefore the failure was not a PostgREST cache problem, payload problem, missing grant, or reason to create a new database RPC.

## Canonical correction
At exact code SHA `ec6eb4cce7803af8e94697adfa6d9308f69a9ee2`, `fetchDashboardSnapshot()` calls only:

`public.get_dashboard_snapshot(p_months, p_as_of)`

and consumes the canonical envelope fields directly:

- `topCustomers`
- `topProducts`
- `categories`
- `aging`
- KPI/trend fields

The public Dashboard snapshot shape is preserved.

## Database evidence
Production database verification established:

- `public.get_dashboard_snapshot(integer,date) -> jsonb` = PRESENT.
- `get_dashboard_top_entities` = ABSENT from `pg_proc`.
- A direct unauthenticated invocation of the canonical snapshot returned `TENANT_CONTEXT_REQUIRED`, confirming the tenant security boundary rather than a missing-function failure.

## Runtime evidence
Authenticated Chrome Production evidence supplied by the owner established:

- `POST /rest/v1/rpc/get_dashboard_snapshot` = **HTTP 200**.
- Dashboard rendered successfully.
- Observed dashboard values included Total Sales `500`, Receivables `360`, Inventory Value `500`, Customers `2`, Products `3`.
- `get_dashboard_top_entities` = **NO REQUEST**.
- No white-screen/runtime failure was observed.

## Closure
The causal chain is closed:

`historical caller drift → missing Production RPC → PGRST202 → canonical caller mutation → exact-SHA Quality PASS → Production deployment → live artifact without old RPC → authenticated HTTP 200 → successful Dashboard UI`

## Certification boundary
This RCA closes the dashboard RPC incident only. It does **not** by itself prove unrelated operational controls such as Backup/Restore, RPO/RTO, Rollback, DR, or Tenant A/B adversarial isolation unless their independent evidence is present in the certification bundle.

Historical records remain preserved; no historical evidence was deleted or rewritten.
