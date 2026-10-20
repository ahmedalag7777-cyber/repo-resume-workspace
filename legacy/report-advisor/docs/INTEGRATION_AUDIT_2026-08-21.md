# Cross-Repository Integration Audit — 2026-08-21

## Scope

Reviewed all three repositories currently visible in the linked `Report-Engainall` account:

- `Report-Engainall/Report-Advisor` — private, populated production repository and current source of truth.
- `Report-Engainall/ReportAdvisor` — public repository currently empty; no source code or commit history available to integrate.
- `Report-Engainall/sb1-6zubls7a` — public repository currently empty; no source code or commit history available to integrate.

## Decision

No blind merge is performed from empty repositories. `Report-Advisor/main` remains the only production source of truth.

The existing integration registry is retained and extended with this cross-repository audit. The previously reviewed internal intelligence branches remain selectively integrated according to the registry policy. Existing production implementations win over duplicate alternatives.

## Safe integration policy

1. Never replace working production UI or query surfaces wholesale when an imported implementation overlaps them.
2. Import only capabilities that have a clear dependency path into the current architecture.
3. Preserve tenant/security/data-truth guarantees.
4. Keep AI/LLM layers out of financial truth paths.
5. Keep local AI and heavy document processors optional unless a future deployment explicitly requires them.
6. Validate imported capabilities with typecheck, build, lint, contract tests, and applicable domain tests.
7. Keep source provenance for every imported capability.

## Current production baseline

The production repository already contains selective intelligence integration, production hardening, advanced intelligence, bounded analysis/concurrency safeguards, document-intelligence service scaffolding, and integration gates. The document service is provider-neutral and optional, which is compatible with the free-first/local-first architecture.

## Remaining useful work

- Upgrade the document-intelligence service from a parser adapter into the full internal Document & Data Intelligence Engine defined in `DOCUMENT_INTELLIGENCE_ENGINE_REQUIREMENTS.md`.
- Add extraction completeness, structured intermediate representation, provenance, semantic mapping, normalization, entity resolution, validation, reconciliation, confidence, quarantine, and canonical routing contracts incrementally.
- Add golden datasets and regression/security/load coverage before production activation.

## Explicitly rejected for now

- Blind copying of alternate App/Header/Sidebar/query/import implementations.
- Making a paid external AI/OCR provider a runtime requirement.
- Adding heavy optional engines without an adapter boundary, resource limits, license review, and a measured benefit.

## Audit conclusion

The linked account exposes three repositories, but only `Report-Advisor` currently contains source history. There is therefore no additional code in the other two repositories that can safely be merged at this time. The next productive phase is implementation of the document intelligence engine on top of the existing provider-neutral service, not another blind repository merge.
