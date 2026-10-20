# Integration Sources Registry

This is the authoritative record of internal Git branches reviewed for reuse. It prevents duplicate implementation and documents what was integrated, rejected, or intentionally deferred.

## Sources reviewed

1. `agent/intelligence-ui-foundation`
2. `feat/production-hardening-v1`
3. `integrate/intelligence-foundation-selective`
4. `integration/intelligence-foundation`
5. `integration/intelligence-selective`

## Integration policy

- `main` is the production source of truth.
- Existing working implementations win when an imported implementation overlaps.
- Unique high-value capabilities are imported selectively.
- No blind branch merge is allowed when histories diverge.
- SQL migrations are imported only when their filenames are unique and their referenced contracts are present or explicitly scheduled for validation.
- AI/LLM layers never become the source of financial truth.
- Open-source tools are adapters/capabilities, not hidden license obligations.
- Optional local AI is not a customer installation requirement.
- Every imported capability must have a dependency path and a verification contract where practical.

## Integrated in current main

### Foundation
- Master product reference and requirements traceability
- Product inspiration and open-source registry
- Free-first architecture
- Document ingestion accuracy contract
- Truth/uncertainty policy
- Safe analytics envelope
- Adaptive processing router/pipeline
- Query planning/execution and evidence ledger
- Decision/financial/operational/predictive intelligence primitives
- Document intelligence gateway

### Production hardening
- Import key normalization RPC
- Import job lifecycle/progress RPC
- Deterministic executive metrics SQL
- Inventory liquidity/velocity and demand/reorder SQL
- Universal data contract
- Universal import contract
- Semantic metrics and metric SSOT
- Data quality/trust
- Freshness gates
- Tenant/security scope
- AI runtime/data policy
- Operational readiness
- Report evidence gate

### Advanced intelligence
- Advanced forecasting/backtesting
- ABC/XYZ/FSN classification
- Anomaly detection
- Opportunity scanning
- Business intelligence engines
- Canonical intelligence orchestration
- Financial decision prioritization
- Inventory intelligence
- Product experience command registry
- Tool/open-source capability registry

## Intentionally not imported wholesale

- Full replacement of `src/App.tsx`, `Header`, `Sidebar`, or existing main UI implementations.
- Foundation's alternative `queries.ts` implementation where it replaces a large existing query surface.
- Foundation's `ImportPage.tsx` replacement; the current import architecture must be upgraded incrementally rather than replaced blindly.
- Local/remote AI provider implementations that would create an unnecessary runtime dependency before the free-first policy is fully wired.
- Trial/entitlement/productization paths until their business policy is explicitly connected to the current product.

## Deferred integration backlog

- Foundation CI workflow after reconciling its npm scripts with the current main scripts.
- Remaining specialist pages where they add UX value without duplicating current routes.
- Additional AI provider adapters behind the capability registry.
- Agent orchestration, memory, scheduled analysis and human approval workflows.
- Remaining open-source engines (DuckDB/Arrow/Polars/Docling/PaddleOCR) as optional adapters behind the processing router.

## Safety rule

A branch is not considered integrated merely because its files exist in the repository. The capability must be reachable through the current architecture, compile against current contracts, pass its applicable tests, and preserve tenant/security/data-truth guarantees.
