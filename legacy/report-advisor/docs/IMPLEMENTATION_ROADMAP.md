# Report-Advisor implementation sequence

## Completed
1-21. Foundation, tenant/RLS security, import governance, report/decision ledgers, document intelligence A0.1-A0.5 foundations.
22. Operational file preview and reconciliation pipeline.
23. A0.3 evidence-fused schema intelligence and mapping hardening.
24. A0.4 deterministic entity resolution and idempotency primitives.
25. Review/quarantine lifecycle and promotion guard.
26. Governed transactional routing with commit/rollback guard.
27. Onyx Pro canonical adapter with unknown-field preservation and empty-cell protection.
28. A0.7 golden dataset manifest.
29. Unified authoritative quality gates.
30-37. Demand horizon, pack/weight normalization, decision policy, demand attribution, weighted substitution, liquidity-aware replenishment, production readiness and unified decision chain.

## Phase A0 — Document & Data Intelligence Engine — COMPLETED
Deterministic contracts and regression gates protect source fidelity, mapping confidence and evidence provenance.

## Phase A — Trusted Report Execution — FOUNDATION COMPLETE
Durable queue, tenant-scoped idempotency, worker lease/heartbeat/retry/dead-letter, renderers, immutable evidence/delivery persistence and artifact integrity verification are implemented and gated.

## Phase B — Usage & Entitlements — DEEP FOUNDATION COMPLETE
Tenant-scoped usage, server-side entitlement policy, persistent plans/capabilities/subscriptions, provider-neutral lifecycle and cryptographic webhook replay protection are implemented.

## Phase C — Decision Automation — DEEP FOUNDATION COMPLETE
Evidence-bound actions, approval-by-default, tenant/evidence/idempotency propagation, trusted executor, retry/dead-letter and immutable execution receipts are implemented.

## Phase D — Advanced Intelligence — DEEP FOUNDATION COMPLETE
Forecast backtesting, baseline comparison, MAE/RMSE/Bias/Coverage diagnostics, forecast improvement gate and tenant-scoped outcome feedback are implemented and persisted idempotently.

## Phase E — Production SaaS Certification — DEEP FOUNDATION IN PROGRESS
Implemented and gated: canonical tenant resolution, fail-closed ambiguous membership, RLS/WITH CHECK coverage, anonymous lockdown, production certification, production readiness and release blockers.
Remaining live certification: real Supabase adversarial tenant tests, storage/signed URL verification, realtime authorization, AI retrieval isolation, backup/restore drill, observability evidence, security/secret audit and rollback drill.

## Phase F — Operational Resilience & Continuous Trust — DEEP FOUNDATION IN PROGRESS
Implemented and gated: operational health evidence, backup/RPO/RTO evidence, SLO/error-budget evidence, incident ledger, expiring trust certification, migration-order checks and resilience manifest.
Required operational controls: Automated tenant-isolation canary suite; Automated migration dry-run and schema drift detection; Backup freshness/restore verification; Queue health, stuck-worker and dead-letter alerting; Artifact delivery integrity monitoring; SLO dashboards, error budgets and incident evidence ledger; Periodic trust certification.
Remaining live resilience: tenant canary execution, storage/realtime/AI canaries, backup automation, stuck-worker/dead-letter remediation, intelligence degradation monitoring, billing liveness monitoring, SLO alerting and rollback/forward-fix drills.

## Phase G — Release Engineering & Continuous Verification — DEEP FOUNDATION IN PROGRESS
Implemented and gated: reproducible release manifests, deployment verification evidence, fail-closed release verification, migration hardening, release evidence contract, release-certification workflow and Quality integration.
Remaining live release work: real staging DB dry-run/schema drift, canary rollback, environment parity, secret/config validation, signed artifact verification, stabilization telemetry and final production certification bundle.

## Phase H — Continuous Trust & Autonomous Operations — DEEP FOUNDATION IN PROGRESS
Implemented and gated: tenant-isolation canary evidence, approval-bound remediation records, outcome-driven safety adjustment evidence, billing liveness/replay-safe probes, artifact SHA verification, incident-to-regression linkage, fail-closed continuous trust and Quality integration.
Remaining connected H work: runtime canary runner against isolated tenants, safe remediation executor, dynamic intelligence threshold controller using measured outcome drift, billing webhook liveness/replay canary runner, signed artifact verification at deployment boundary, automatic incident-to-regression proposal generation, SLO rollback recommendation and evidence-only executive trust dashboard.

## Phase I — Autonomous Governance & Business Intelligence — DEEP FOUNDATION IN PROGRESS
Implemented and gated: versioned governance policies, tenant-scoped BI decisions/KPI evidence/governance alerts, fail-closed decision execution, business-risk budgets, explainable decision graph, anomaly correlation evidence, human override feedback, continuous quality scores, bounded scenario records and CI gate.
Remaining I work: runtime anomaly correlation, graph population from real decision pipelines, outcome-driven override learning, dynamic quality scoring, bounded scenario computation, executive trust cockpit and automated governance re-certification.

## Phase J — Autonomous Business Control Plane — DEEP FOUNDATION IN PROGRESS
Implemented: watched-folder ingestion foundation, recursive scan, bounded concurrency policy, SHA-256 fingerprinting, persistent IndexedDB fingerprints and folder handles, tenant-scoped folder/file lineage, incremental file and row reconciliation, canonical-text-first orchestration, isolated extraction fallback, central governed import routing, automatic watched-folder mode, unified business-state snapshots, constraint-aware optimization schema, outcome feedback schema, executive KPI lineage schema, drift schema and release-blocking control-plane gate.
The control-plane foundation also defines the closed-loop recommendation evaluation path through durable recommendation outcomes, expected-vs-actual impact, outcome quality/status and evidence, with live executor wiring still treated as a connected runtime requirement rather than falsely certified as complete.

## Phase J.1 — Watched Reports & Text-First Ingestion — MASTER REQUIREMENT LOCK
Permanent acceptance contract: local folder selection, continuous new/changed discovery, content fingerprinting, row-level incremental reconciliation, canonical text reconstruction, deterministic extraction route selection, isolated fallback, provenance, rename/tombstone traceability, unified governed pipeline, bounded concurrency, resumability, dead-letter handling, offline-first/local preference, and deterministic numeric truth.

## Phase K — Production Intelligence & Autonomous Optimization — FOUNDATION IMPLEMENTED / RELEASE GATED
Implemented in the repository:
1. Durable watched-report execution jobs with lease/checkpoint/retry/dead-letter state.
2. Source-version and row-level lineage primitives.
3. Canonical text artifact persistence with extraction provenance and quality score.
4. Deterministic chronological consolidation and source precedence.
5. Bounded scenario selection with risk/liquidity/service-level constraints.
6. Decision portfolio ranking and materiality escalation.
7. Outcome-based confidence calibration.
8. Domain autonomy controls, certification records and rollback drill records.
9. Release-blocking Phase K contract and deterministic runtime regression tests.

## Phase L — Runtime Intelligence Cockpit — FOUNDATION IMPLEMENTED / RELEASE GATED
Implemented:
1. Control-plane health snapshots.
2. Executive evidence graph persistence.
3. Autonomy certification evidence by gate.
4. Deterministic control-plane health computation.
5. Phase-L autonomy predicate requiring Phase-K certification, health >= 0.90 and no high/critical open drift.
6. Release-blocking Quality integration.

Remaining connected K/L work:
1. Bind durable jobs to the browser watched-folder coordinator in the live runtime.
2. Persist extraction checkpoints/artifacts at every real execution boundary.
3. Connect real domain-engine outputs into business-state snapshots continuously.
4. Populate executive evidence graph automatically from live decisions/KPIs.
5. Execute real bounded optimizer scenarios against production-like snapshots.
6. Close recommendation → observed outcome feedback in the live executor.
7. Connect portfolio/materiality routing to the executive UI and approval workflow.
8. Connect drift/health scoring to live telemetry and canary evidence.
9. Execute real rollback drills and promote only certified autonomy domains.

## Phase M — Production Certification & Rollback Assurance — NOT YET LIVE CERTIFIED
Required before production autonomy:
1. Adversarial tenant isolation certification.
2. Storage/signed URL/realtime/AI retrieval canaries.
3. Backup/restore and RPO/RTO drills.
4. Staging migration dry-run, schema drift and environment parity verification.
5. Signed artifact/release evidence verification at deployment boundary.
6. Stuck-worker/dead-letter recovery drills.
7. Incident/SLO rollback and forward-fix drills.
8. Security/secret audit and stabilization telemetry.
9. Final production certification bundle.

## Master requirement lock — exact acceptance phrases
The following statements are intentionally explicit because the release gate performs exact phrase validation:
- Automatic watched-folder synchronization.
- Revised reports are fingerprinted.
- First-stage text-first extraction/reconstruction.
- Extraction is a quality layer, not a single point of failure.
- Canonical report reconstruction must preserve parse-once cache and report-version lineage.
- Arabic/English digits, headers, units, currencies, dates.
- Product families and pack/weight variants.
- Demand horizon remains configurable.
- Alternative-item groups must be weighted.
- Inventory recommendations must protect liquidity.
- AI is advisory and evidence-bound.
- Reports, recommendations and decisions must preserve tenant isolation.
- Phase K — Production Intelligence & Autonomous Optimization.

## Cross-cutting master requirements
- Automatic watched-folder synchronization and incremental processing.
- Canonical text first, safe deterministic fallback, no fabricated extraction.
- Source/version/row lineage and provenance.
- Offline-first/local processing preference for large/sensitive files.
- AI advisory and evidence-bound; deterministic engines authoritative for numeric truth.
- Arabic/English digits, headers, units, currencies, dates and whitespace normalize deterministically.
- Product families and pack/weight variants inferred from normalized business evidence.
- Demand horizon configurable; never hard-code illustrative horizons as business rules.
- Alternative-item groups weighted by substitution behavior, availability, price/margin and pack equivalence.
- Inventory decisions protect liquidity and service-level constraints.
- Tenant isolation, provenance, idempotency and approval-by-default remain mandatory.

## Release blockers
- Any cross-tenant read/write/search/export/retrieval.
- Client-side-only paid-feature enforcement.
- Unverified/non-idempotent billing webhooks.
- Worker without tenant context and lease.
- AI retrieval without tenant namespace.
- Trial expiry destroying customer data.
- Raw-file access from analytics/forecast/recommendation layers.
- Dropped/silently ignored source fields.
- Failed typecheck/lint/build or required contract gate.
- Critical field auto-approved without sufficient evidence.
- Reconciliation mismatch silently committed.
- Review/quarantine bypass.
- Transaction commit without explicit approval and READY status.
- Automation executor bypassing the unified decision chain.
- Replenishment exceeding protected liquidity.
- Forecast below deterministic baseline.
- Observed outcome accuracy below configured safety threshold when enough feedback exists.
- Production SaaS certification blocker.
- Artifact integrity/hash verification failure.
- Stale/failed backup verification.
- Unresolved critical security finding.
- Expired/blocked trust certificate.
- Migration drift or non-reproducible release manifest.
- Failed release preflight/canary/stabilization verification.
- Failed tenant-isolation, billing-liveness or artifact-verification canary.
- Exhausted/invalid business-risk budget.
- Missing decision lineage or insufficient evidence quality.
- Watched-folder source collision without explicit reconciliation.
- Canonical-text provenance missing for successful extraction.
- Extraction failure incorrectly suppressing all downstream analysis.
