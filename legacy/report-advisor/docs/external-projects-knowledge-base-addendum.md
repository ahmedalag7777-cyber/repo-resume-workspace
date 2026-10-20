# External Projects Knowledge Base Addendum

This addendum is the canonical placeholder for externally-derived engineering requirements and feature decisions that are safe to encode as project requirements. It must not contain credentials, private source code copied from external projects, or unverified claims.

## Required integration principles
- Prefer provider-neutral contracts over vendor lock-in.
- Preserve deterministic behavior at data boundaries.
- Treat external projects as inspiration/reference evidence, not as permission to copy proprietary code.
- Record the source category, capability, adoption decision and security implications for each imported idea.
- Keep tenant isolation, provenance, review/quarantine and zero-silent-loss rules mandatory.

## Capability categories retained for Report-Advisor
1. Document/OCR/table extraction resilience.
2. Schema discovery and semantic mapping.
3. Entity resolution and reconciliation.
4. Data lineage and evidence traceability.
5. Business intelligence dashboards and decision workflows.
6. Forecasting, scenario analysis and calibration.
7. Local/offline analytical acceleration.
8. Production observability and reliability.
9. Secure multi-tenant retrieval and authorization.
10. Import/export interoperability including Onyx Pro.

## Adoption rule
A capability is considered adopted only when it is represented in the implementation roadmap, has an implementation boundary, and has an automated regression/contract gate where the capability affects correctness, security, or production behavior.
