# Multi-tenant isolation release test matrix

Release blocker: every negative test must return zero rows / forbidden error.

## Identity
- [ ] Unauthenticated requests cannot read tenant data.
- [ ] User A can see only memberships for A.
- [ ] User B cannot enumerate A's company UUID through normal queries.

## CRUD
- [ ] A SELECT B company returns zero rows.
- [ ] A SELECT B customer/product/invoice/import/report returns zero rows.
- [ ] A INSERT a row with B company_id is rejected.
- [ ] A UPDATE a B row is rejected.
- [ ] A DELETE a B row is rejected.
- [ ] A cannot move an existing row from A to B by changing company_id.

## Parent/child leakage
- [ ] A cannot read B sale_items through a known invoice_id.
- [ ] A cannot read B purchase_items through a known invoice_id.
- [ ] A cannot read B import_rows through a known import_id.
- [ ] A cannot read B import_job_rows through a known job_id.

## AI / search
- [ ] A vector retrieval namespace excludes B.
- [ ] A Chat2BI query can only resolve A's semantic data.
- [ ] A report evidence/lineage cannot reference B.
- [ ] A AI memory/conversation cannot retrieve B.

## Operational channels
- [ ] A realtime subscription cannot receive B events.
- [ ] A scheduled report cannot send B data to A.
- [ ] A webhook cannot be generated from B events.
- [ ] A notification feed contains only A.
- [ ] A export contains only A.

## Storage / cache
- [ ] A cannot access B document/object paths.
- [ ] Cache keys contain tenant identity.
- [ ] Browser cache/local storage contains no cross-tenant business payload.

## Billing / trial
- [ ] A's trial expiry does not change B entitlements.
- [ ] A's upgrade does not unlock B.
- [ ] A's usage counters are separate from B.

## Adversarial IDs
Attempt all known IDs from another tenant via URL, query string, JSON body, filter, sort, pagination cursor, import mapping and report ID.

## Acceptance
No cross-tenant read, write, export, notification, realtime event, cache hit, AI retrieval or billing entitlement is acceptable in production.
