# Batch 20 — Data Quality Scalability Plan

## Scope
Move Data Quality from unbounded client-side `select *` reads toward bounded/aggregate reads without changing Tenant/RLS semantics.

## Current verified state
- Data Quality no longer consumes `COMPANY_ID` from the UI boundary.
- `src/lib/data-quality-queries.ts` is the canonical query boundary.
- RLS/current tenant remains the security boundary.
- The current query boundary still performs broad reads and therefore remains a scalability concern.

## Required invariants
1. Never accept a tenant/company id from the UI for authorization.
2. Preserve the current Data Quality result contract before optimizing internals.
3. Prefer server-side aggregates for counts, null rates, duplicates, and anomaly summaries.
4. Keep drill-down records bounded and explicitly paginated.
5. Fail closed on query errors; never present partial results as complete quality results.
6. Add regression coverage before removing the existing broad-read implementation.

## Implementation order
1. Inventory the exact metrics currently calculated by `DataQualityPage`.
2. Map each metric to a bounded query or RPC.
3. Add equivalent aggregate functions/RPCs under RLS.
4. Add parity tests against representative fixtures.
5. Switch the query boundary only after parity is proven.
6. Remove broad reads after successful regression evidence.

## Evidence policy
Implemented != Integrated != Runtime-Evidenced != Production-Certified.
No production/scalability claim is made until executable evidence exists.
