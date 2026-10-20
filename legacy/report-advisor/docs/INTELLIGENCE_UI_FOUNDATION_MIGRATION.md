# Intelligence UI Foundation — Consolidation Map

This document records the reusable work from `agent/intelligence-ui-foundation` so the production architecture does not duplicate engines.

## Adopted capabilities

- Truth Policy: VERIFIED / QUALIFIED / INSUFFICIENT_DATA / BLOCKED.
- Safe analytical output envelope.
- Adaptive processing routing: FAST / WORKER / DOCUMENT_AI / HEAVY_ANALYTICS / OFFLINE.
- Evidence and lineage requirements before analytical output.
- Executive intelligence signals, morning brief, and money view.
- AI query guard and evidence context.
- Report Studio contracts.
- Security scope foundation: company / branch / warehouse.
- Open-source adapter registry for document/data processing.

## Integration rule

Existing engines remain the single source of implementation. Do not create parallel import, OCR, metric, forecast, decision, or AI engines when an existing capability can be adapted.

## Hidden implementation boundary

The customer-facing application exposes capabilities, not vendor/library names or internal routing details. Open-source license notices remain compliant wherever required. Internal adapters, routing policies, thresholds, prompts, caching, validation, and fallback logic are implementation details.

## Required execution path

Source -> Adaptive Router -> Existing Engine/Adapter -> Canonical Data -> Validation -> Reconciliation -> SSOT Metrics -> Evidence/Lineage -> Truth Policy -> Analytics/Decision/AI -> UX.

## Migration status

The reusable foundation is considered an architectural input, not production-proven until its contracts pass CI and its paths are covered by Golden Data and E2E tests.
