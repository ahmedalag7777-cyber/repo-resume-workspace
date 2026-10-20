# Report-Advisor — Master Requirements Coverage

Date: 2026-08-22
Source of truth: `main`

This matrix consolidates the current implementation roadmap and the canonical Document & Data Intelligence requirements. A requirement is **not complete** merely because a static contract exists; it must have behavioral/integration evidence before production activation.

## Release-critical foundation

| Area | Current state | Gate to complete |
|---|---|---|
| Tenant isolation / RLS | Implemented in later architecture, but legacy migrations contain permissive anon policies | Verify effective deployed policies and remove/replace legacy permissive access without breaking local-first UX |
| Membership / privilege hardening | Foundation completed | Negative cross-tenant tests + deployed-policy verification |
| Trial / entitlement server enforcement | Foundation completed | Full server-boundary regression + billing lifecycle |
| Unified import governance | Import RPC/job foundation exists | Prove every bulk destination uses governed transactional path |
| Raw-data safety | Contract foundation completed | End-to-end assertion that analytics/reporting/recommendations cannot consume raw/unvalidated data |
| Typecheck / lint / build | Quality baseline green on validated run | Must remain green after each hardening batch |

## A0 Document & Data Intelligence

### A0.1 Contracts and safety — FOUNDATION COMPLETE
- Provider-neutral interfaces.
- Raw/extracted/staging/validated/reconciled/approved/review/quarantine lifecycle.
- Optional heavy/local providers.
- Source provenance/version boundaries.

### A0.2 Intermediate representation — FOUNDATION COMPLETE
- Provider-neutral envelope.
- Source/cell provenance.
- Unknown-field preservation.
- Parser adapter boundary.

### A0.3 Schema discovery — FOUNDATION + HARDENING IN PROGRESS
- Dynamic profiling.
- Numeric/date/text fingerprints.
- Arabic/English semantic candidates.
- Locale numeric handling.
- Duplicate canonical-field protection.
- **Remaining:** relationship graph, headerless reverse-schema inference, page/table classification, richer OCR-error dictionary, company-data evidence fusion, behavioral golden fixtures.

### A0.4 Validation/reconciliation — FOUNDATION + HARDENING IN PROGRESS
- Confidence and criticality.
- Line math.
- Invoice math.
- Absolute/relative tolerances.
- PASS/WARN/FAIL/UNKNOWN.
- Review/quarantine decisions.
- **Remaining:** entity resolution, deduplication/idempotency, accounting/inventory reconciliation, field-level lineage persistence, review persistence/UI, behavioral reconciliation suite.

### A0.5 Routing/import — FOUNDATION + HARDENING IN PROGRESS
- Canonical semantic routing.
- Unknown → quarantine.
- Duplicate canonical mappings → quarantine.
- **Remaining:** governed import/upsert integration, transaction rollback, idempotency keys, production destination adapters.

### A0.6 Onyx adapter — NOT COMPLETE
- Must enter through the same canonical pipeline.
- Must preserve isolation and reconciliation evidence.

### A0.7 Golden datasets / quality — PARTIAL
- Contract and hardening gates exist.
- **Remaining:** representative Arabic/English, scanned, random-schema, no-header, complex-table, invoice, Onyx, image and 30+ column fixtures; behavioral pipeline/OCR/mapping/entity/security/load gates; measured accuracy metrics.

## Downstream production phases

### Phase A — Report execution
- Trusted worker adapter.
- Saved semantic definition rendering.
- Queue/claim/report evidence.
- Delivery receipts.

### Phase B — Usage / entitlements
- Server-side limits.
- Billing adapter.
- Invoice/subscription lifecycle.
- Verified webhooks.

### Phase C — Decision automation
- Explainable automation actions.
- Approval before external side effects.
- Idempotency.
- Retry/backoff/dead-letter.

### Phase D — Advanced intelligence
- Forecast backtesting.
- Deterministic baselines.
- Confidence/coverage diagnostics.
- Scenario/sensitivity analysis.
- Semantic caching/local acceleration where justified.

### Phase E — Production SaaS
- Cross-tenant negative tests.
- Storage policy audit.
- Realtime authorization audit.
- AI retrieval namespace audit.
- Backup/restore drill.
- Observability/SLOs.
- Security/release checklist.

## Non-negotiable release blockers

1. Cross-tenant read/write/search/export/retrieval.
2. Client-only paid-feature enforcement.
3. Unverified billing webhooks.
4. Worker without explicit tenant context.
5. AI retrieval without tenant namespace.
6. Trial expiry that destroys customer data.
7. Raw-file access from downstream analytical services.
8. Dropped or silently ignored source fields.
9. Failed typecheck/lint/build.
10. Critical field auto-approved without sufficient evidence.
11. Reconciliation mismatch silently committed.
12. Production routing that bypasses the governed import engine.

## Current execution priority

1. Security/effective-policy verification.
2. A0.3 relationship/headerless/page-table hardening.
3. A0.4 entity resolution + idempotency + reconciliation persistence.
4. A0.5 transactional governed routing.
5. A0.6 Onyx adapter.
6. A0.7 golden datasets and behavioral quality gates.
7. Only then downstream report automation and advanced intelligence release work.
