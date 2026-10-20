# Integrated Phases N–S — Execution Addendum

This addendum is part of the authoritative implementation roadmap. It exists separately so the long historical roadmap is preserved verbatim while the K→S closure phases remain explicit and testable.

## Phase N — Runtime Evidence & Recovery
- Real worker lease-expiry, heartbeat loss, checkpoint recovery and dead-letter replay drills.
- Failure evidence preservation and deterministic retry/recovery.
- Backup restore and RPO/RTO evidence where the connected environment permits it.
- No certification from static wiring alone.

## Phase O — Adversarial Tenant & Security Runtime
- Cross-tenant read/write attempts against every canonical RPC and direct data path.
- Storage and signed-URL isolation.
- Realtime authorization isolation.
- AI/retrieval namespace isolation.
- Secret/configuration audit and fail-closed behavior.

## Phase P — Document Intelligence Depth
- Provider-neutral intermediate representation.
- Page/table/headerless/merged-cell classification.
- Arabic/English/scanned/random/no-header/poor-quality corpus.
- Cell-level provenance and deterministic reconciliation.
- Confidence/quarantine/reprocessing evidence.

## Phase Q — KPI / BI Truth & Cross-Surface Equivalence
- One metric definition → authoritative source → formula → query/service → dashboard/report/export chain.
- Explicit date-window semantics.
- Missing data remains missing; no fabricated zero/default.
- Cache freshness/invalidation and provenance exposure.
- Dashboard/report/export equivalence tests.

## Phase R — Decision → Action → Outcome Loop
- Evidence → quality → confidence → decision → recommendation → authorized action → outcome.
- Recommendation feedback and measurable impact.
- Executive approval/action lifecycle.
- Reopen/escalation when outcomes invalidate assumptions.

## Phase S — Production Certification
- Full integrated E2E across tenant, import, document, KPI, decision, worker and recovery surfaces.
- Release artifact integrity and environment parity.
- Production-like bounded scenarios and live canaries.
- Final P0 certification matrix must be PASS; otherwise status remains NOT CERTIFIED.

## Cross-phase rule
N–S do not create parallel engines. They integrate and harden the canonical engines already present in the repository. Static contracts are necessary but never sufficient for LIVE certification.
