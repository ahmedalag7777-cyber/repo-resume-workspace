## CANONICAL RUNTIME UPDATE — 2026-09-30 / RENDERED OUTPUT + INTERRUPTION RECOVERY

The canonical import/runtime path now has an explicit durability boundary after the `committed` stage:

- The existing durable lifecycle remains `queued → fingerprinted → extracted → canonicalized → validated → analyzed → decisioned → committed → rendered`; no replacement lifecycle was introduced.
- The durable runner captures a structured `renderedOutput` returned by the canonical adapter at the `rendered` stage and persists it with the durable completion evidence.
- The canonical import adapter verifies the source-bound canonical commit before recovery/finalization, then closes an open `import_jobs` record through the governed `import_finish_job` RPC.
- A browser/session interruption after a durable job reaches `completed` is now recoverable: the adapter reuses the completed durable job after source/commit readback instead of blindly rerunning the canonical write.
- Rendered outputs are source-bound metadata only; unavailable evidence, decision, action, outcome, learning, replay, and benchmark states remain explicitly non-success states. No financial result, outcome, or benchmark value is synthesized.
- This change is canonical runtime knowledge and must be verified on the exact resulting SHA before any report is marked `CLOSED`.

---

# MASTER ENGINEERING ARCHITECTURE — الأغبري / Report-Advisor
Status: CANONICAL DOMAIN REFERENCE

## 1. Scope
This file owns the canonical technical architecture. Existing working paths are preferred over rewrites. New paths require evidence that the canonical path cannot safely satisfy the requirement.

## 2. Canonical principles
- source-first ingestion
- canonical truth before interpretation
- deterministic business calculations
- evidence/provenance for consequential outputs
- tenant isolation at every data boundary
- fail-closed certification
- reuse existing RPC/runner/import lifecycle
- no speculative architecture
- no duplicate engines

## 3. Canonical business/runtime chain
Source -> Extraction -> Normalization -> Validation -> Reconciliation -> Canonical Truth -> Semantic Metrics -> Analysis -> Evidence -> Signal -> Intelligence -> Recommendation -> Decision -> Approval -> Action -> Outcome -> Learning -> Benchmark

## 4. Canonical import lifecycle
queued -> fingerprinted -> extracted -> canonicalized -> validated -> analyzed -> decisioned -> committed -> rendered

Known canonical targets:
- import_commit_batch
- import_finish_job
- get_dashboard_snapshot
- get_dashboard_intelligence
- runDurableProductionLifecycle
- production-coordinator-bridge.ts

These are governed examples from current architecture, not permission to create aliases or replacements.

## 5. Tenant and authorization
All business reads/writes must preserve:
- current_company_id
- RLS
- server-side authorization
- provenance/source identity
- company-scoped queries
- business readback

Browser sessions must not use service-role credentials.

## 6. Document intelligence
Document processing remains source-first. OCR trust rules:
- score < 50 => reject
- 50–74 => review
- >= 75 => trusted

Raw documents must not be sent to local AI merely for convenience.

Local AI is assistive only; deterministic extraction/validation and business calculations remain authoritative.

## 7. Compatibility rule
Compatibility modules must forward to canonical paths rather than create second semantics.

queries-compat is forwarding-only where the current implementation requires it.

Legacy specialized import branches may remain for compatibility, but the user-facing product remains domain-neutral and unified.

## 8. Calculation truth
- deterministic calculations are authoritative
- AI explains/synthesizes/recommends wording
- missing cost basis blocks profitability
- forecast minimum-data gates remain explicit
- benchmarks can return INSUFFICIENT SAMPLE
- stale/unknown data cannot silently become executive truth
- current product currency contract uses YER

## 9. Consolidation rules for code
KEEP / IMPROVE / REPLACE / REMOVE.

Before REMOVE:
- search references/callers
- inspect migrations/RPCs
- inspect workflows/tests
- preserve behavior
- re-run affected gates

Never solve duplication by adding a wrapper around another duplicate.

## 10. Architecture completion criteria
A technical change is complete only when:
- canonical path identified
- root cause reproduced where applicable
- minimal safe change implemented
- targeted test passes
- relevant regression passes
- exact-SHA source verification performed
- no duplicate path introduced
- current documentation/index updated

## 11. Absorbed architecture capabilities and reference patterns

The former architecture reference also identified these valid capability directions. They are retained as canonical product/architecture targets only when implemented through governed paths:

### Business intelligence
- executive situation/command view
- drill-down, drill-through and cross-filtering
- semantic natural-language-to-metric flow with deterministic query validation
- saved analyses, dashboards, report templates and versions
- KPI, trend, comparison, ranking, distribution, forecast and anomaly visualization

### Inventory, demand and liquidity
- moving versus frozen/slow inventory
- days-to-clear and liquidation analysis
- demand velocity and seasonality
- stockout date, reorder point, safety stock and purchase priority when minimum-data gates pass
- receivable/payable schedules and liquidity-priority analysis

### Semantic metric layer
Important metrics have:
- definition
- formula
- source
- owner
- permissions
- version
- last update
- validation/tests

### Event and decision chain
Business event -> metrics -> alerts -> investigation -> recommendation -> approval when sensitive -> action -> verification -> audit.

Sensitive operations such as payments, deletion, financial changes, bulk messaging and permission changes require explicit human approval and audit controls where the capability exists.

### Agent architecture
Agents are governed by:
- role
- responsibilities
- tools
- permissions
- skills
- memory
- model
- output schema
- quality criteria
- version
- owner

Agent execution follows:
Understand -> Plan -> Execute -> Verify -> Review -> Deliver

Agent observability should retain model/tool context, duration, errors, evidence, confidence and validation.

### Research/evidence workflow
Question -> Planning -> Search -> Evidence -> Gap Detection -> Verification -> Synthesis -> Report

### Report Studio
Reports are structured artifacts containing sections, KPIs, charts, tables, evidence, calculations, recommendations, risks and appendices, with versioning and export/print where supported.

### Data engine
Deterministic transformations cover filtering, grouping, aggregation, joins, pivots, rolling windows, time series, rankings, statistics, missing/duplicate detection and outliers. Reusable Recipes follow:
Input -> Normalize -> Map -> Transform -> Validate -> Output

### Scaling discipline
Small data uses direct deterministic SQL/local processing; medium data uses optimized SQL/batches; larger scale requires measured workload justification before introducing distributed systems.

Do not introduce Spark/streaming infrastructure only because it is architecturally fashionable.
