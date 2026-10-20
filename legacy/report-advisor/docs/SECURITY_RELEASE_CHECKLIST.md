# Production Security Release Checklist

## Tenant isolation
- [ ] Tenant A cannot read Tenant B rows through any table/API.
- [ ] Tenant A cannot create membership in Tenant B.
- [ ] Tenant A cannot change its role to owner/admin.
- [ ] Tenant A cannot move a membership to another tenant.
- [ ] Child records cannot bypass parent tenant checks.
- [ ] Reports and schedules require matching company_id.
- [ ] Search and exports are tenant-scoped.
- [ ] Realtime channels are tenant-authorized.
- [ ] Storage object paths and policies are tenant-scoped.
- [ ] Cache keys include tenant identity.
- [ ] AI retrieval, embeddings and conversation memory are tenant-scoped.

## Identity
- [ ] Anonymous access is disabled for customer data.
- [ ] Session expiration and refresh are configured.
- [ ] Password reset and email verification flows work.
- [ ] Role changes are audited.
- [ ] Support/admin access is explicit and audited.

## Billing / trial
- [ ] Trial is tenant-scoped.
- [ ] Entitlements are server authoritative.
- [ ] Expired trial cannot call premium APIs/jobs.
- [ ] Paid tenant cannot inherit another tenant's plan.
- [ ] Usage counters are tenant-scoped.

## Data integrity
- [ ] Historical data is preserved on downgrade.
- [ ] Export contains only authorized tenant data.
- [ ] Background jobs carry tenant context.
- [ ] Scheduled reports resolve recipients inside tenant scope.

## Release gate
Production release is blocked if any cross-tenant negative test fails, even when the UI appears correct.
