# Metric Truth Ownership Map

## Business Truth → Single Owner

| Area | Single owner | Role | Secondary implementations |
|---|---|---|---|
| Business metric definitions | `src/lib/semanticMetrics.ts` | Canonical metric catalog: key, formula, source, unit, dependencies and declared status | None |
| Metric governance / SSOT | `src/lib/metricSSOT.ts` | Governance projection of the canonical catalog: version, owner, evidence requirements and decision safety | Adapter/projection only |
| Metric evaluation runtime | `src/lib/metricEngine.ts` | Evaluates supplied values against the canonical definition and emits a metric fact/evaluation | Consumer of semanticMetrics |
| Persisted semantic governance | `src/lib/semantic-metric-service.ts` | Reads persisted `metric_governance` records and registry freshness | Adapter only |
| Canonical intelligence composition | `src/lib/canonicalIntelligence.ts` | Composes canonical inputs into intelligence and invokes the metric evaluator/domain engines | Composer/consumer only |
| Domain intelligence algorithms | `src/lib/businessIntelligenceEngines.ts` | Aging, trend, replenishment, customer/supplier scoring, liquidity, CCC and what-if algorithms | Pure domain algorithms only |
| Source-report truth/provenance presentation | `src/lib/report-smart.ts` | Tenant-scoped Smart Report view model, source fingerprint, canonical coverage, evidence and verification state | Presentation/verification consumer |
| Canonical data access | `src/lib/queries.ts` | Tenant-scoped queries and canonical RPC projections | Single query owner |
| Compatibility access | `src/lib/queries-compat.ts` | Legacy delegate to canonical query functions | Compatibility-only |

## Ownership rule

A calculation outside the owner is permitted only when it is a pure domain algorithm with a different responsibility, a persistence/query adapter, a presentation/verification consumer, or a compatibility-only delegate.

A second implementation of the same business metric must be removed, delegated, or explicitly classified under one of those categories. No surface may silently become a competing source of business truth.
