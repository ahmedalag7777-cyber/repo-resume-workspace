# Mutation Record — Dashboard RPC Contract Alignment

**Mutation date:** 2026-09-02  
**Old exact code SHA:** `6410f161668572fbf9a913529456b3b2f1d1821d`  
**New exact code SHA:** `ec6eb4cce7803af8e94697adfa6d9308f69a9ee2`  
**Commit:** `fix: align dashboard caller with canonical snapshot RPC`

## Authorization / scope
Owner-authorized minimal canonical mutation. Documentation in this record is post-mutation consolidation only; no additional code, database, migration, RLS, auth, workflow, or deployment mutation is authorized or performed here.

## File changed
`src/lib/dashboard-canonical.ts`

## Exact change
Removed the secondary `supabase.rpc('get_dashboard_top_entities')` call from `fetchDashboardSnapshot()` and consumed `topCustomers` / `topProducts` directly from the canonical `get_dashboard_snapshot` response.

Preserved:

- public `Snapshot` shape
- KPI parsing
- trend data
- categories
- aging semantics
- array limits (`10`)
- validation and error handling
- `fetchDashboardIntelligence()` contract

## Before → After

```text
BEFORE
get_dashboard_snapshot + get_dashboard_top_entities

AFTER
get_dashboard_snapshot only
```

## Mutation size
The exact commit changed **one file** with **1 addition / 1 deletion** in the relevant source line. No database mutation was made.

## Verification boundary
- Quality Run `33588898048` on exact SHA `ec6eb4cce7803af8e94697adfa6d9308f69a9ee2` = **PASS**.
- Production deployment: `dpl_2eucnVguBRL5c2dGTakd5zqEVHB1` = **READY / Production**.
- Live artifact: `/assets/index-B49eOQQy.js`.
- Live Dashboard code no longer contains the active `get_dashboard_top_entities` call.
- Production DB contains canonical `get_dashboard_snapshot(integer,date)` and lacks `get_dashboard_top_entities`.
- Owner-provided authenticated Chrome evidence: `get_dashboard_snapshot` HTTP `200`; Dashboard rendered; old RPC = no request.

## Historical integrity
The previous exact code SHA and all prior evidence remain historical. No amend, rebase, reset, merge, or history rewrite was performed.
