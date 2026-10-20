# Report-Advisor — Multi-Tenant Isolation & Security Contract

## Non-negotiable rule
A tenant/customer must never be able to read, infer, modify, export, search, cache, or receive notifications belonging to another tenant.

## Isolation model
Every business record is tenant-scoped:

`tenant_id -> organization -> users -> roles -> data`

Required for all tenant-owned tables:
- `tenant_id NOT NULL`
- foreign key to tenants/organizations
- indexes beginning with `tenant_id` for high-volume tables
- Row Level Security (RLS) enabled
- policies based on the authenticated user's tenant membership

## Server-side authorization
Tenant context must be resolved from the authenticated identity on the server/database, never trusted from a browser-supplied arbitrary `tenant_id`.

Client-provided tenant IDs can be used as a filter only after authorization confirms membership; they must never grant access.

## RLS policy principle
Conceptually:

`row.tenant_id = current_user_tenant_id()`

For writes:
- INSERT: new row tenant must equal current tenant.
- SELECT: only current tenant rows.
- UPDATE: old and new tenant must equal current tenant.
- DELETE: only current tenant rows.

Service-role/background jobs must still explicitly carry tenant context and must never query all tenants without an audited administrative purpose.

## Cross-tenant attack prevention
Test all of the following:
- change tenant ID in URL/query/body
- change UUID of a customer/product/order
- enumerate sequential IDs
- alter API filters
- export without tenant filter
- search without tenant scope
- scheduled job using another tenant's ID
- notification recipient mismatch
- cached response from another tenant
- websocket/realtime subscription without tenant authorization
- uploaded file/object path traversal
- AI retrieval across tenant indexes
- embeddings/vector search without tenant namespace
- report templates referencing foreign tenant data

Expected result: zero cross-tenant records returned or modified.

## Storage isolation
Object storage paths must be tenant scoped, for example:

`tenants/{tenant_id}/documents/{document_id}`

Storage policies must validate membership in the same tenant. Public buckets must not be used for private customer documents.

## Cache isolation
Every cache key must include tenant identity:

`tenant:{tenant_id}:metric:{metric}:{period}:{filters_hash}`

Never cache a tenant-specific response under a global key.

## AI isolation
Every AI operation carries tenant context:
- retrieval namespace
- vector index filter
- document IDs
- SQL/query authorization
- conversation history
- memory
- generated report cache

The model must never receive another tenant's context.

## Analytics and telemetry
Product analytics must not expose customer business data to other customers. Aggregate telemetry only where permitted. Avoid putting raw invoice/customer/product values into third-party analytics events.

## Backups and exports
Backups remain logically tenant-separated. Customer exports contain only that customer's authorized data.

Administrative support access must be explicit, audited, time-limited where possible, and never silently grant broad customer visibility.

## Notifications
Notifications, email, WhatsApp/webhook events, desktop alerts and scheduled reports must resolve recipients from the tenant's authorized membership and data. A background worker must carry `tenant_id` as mandatory context.

## Trial and billing isolation
Trial state, usage counters, plans, invoices and entitlements are tenant-scoped. One tenant's subscription status must never unlock/lock another tenant.

## Required database safeguards
Before production:
1. inventory every table and classify as global, tenant-owned, or system-only
2. add missing tenant foreign keys
3. enable RLS on every tenant-owned table
4. create positive and negative authorization tests
5. review storage policies
6. review realtime channels
7. review server functions and service-role usage
8. review SQL views/materialized views for tenant leakage
9. review imports/exports
10. review AI/vector retrieval

## Security acceptance criterion
A tenant-isolation test suite must prove:

`Tenant A cannot SELECT/INSERT/UPDATE/DELETE/export/search/subscribe/retrieve Tenant B data.`

This is a release blocker for production SaaS.
