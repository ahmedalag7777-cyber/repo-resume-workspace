# Report-Advisor — Final Comprehensive Specification Implementation Baseline

## Purpose
This document establishes the implementation baseline for the merged final specification of Report-Advisor. It is a living execution contract: existing working functionality must be preserved; missing functionality must be implemented; no feature is considered complete without an end-to-end path and acceptance evidence.

## Product scope
Report-Advisor is a unified business intelligence, reporting, operational analytics, decision-support, data-import, data-quality, inventory, finance, customer, supplier and AI-grounded platform. It is not only a report viewer.

## Non-negotiable principles
1. Existing working UI and database behavior are preserved unless a change is required by a specification, security fix, correctness fix, or measurable performance improvement.
2. Financial and operational numbers are calculated from source data; an LLM may explain or recommend but must never invent facts.
3. Every important metric must have traceability to its source data and calculation definition.
4. Imports must be idempotent and key-based. Blank source values must not erase existing values unless the import policy explicitly says so.
5. Import preview must distinguish New, Update, Unchanged, Duplicate and Invalid rows.
6. Heavy file processing must not block the UI.
7. Security boundaries must be enforced in the database, not only in the client.
8. Every major workflow requires negative/error-path handling and auditable results.

## Required capability domains
- Executive dashboard and decision cockpit.
- Sales, purchases, inventory, receivables, payables, profitability and cash-flow reporting.
- RFM, ABC, aging, margin, pricing and trend analytics.
- Forecasting, scenarios, alerts and recommendations.
- Customers, suppliers, products, categories, branches and warehouses.
- Universal file ingestion: XLSX/XLS/XLSM/ODS, CSV/TSV, JSON/JSONL, XML, TXT/Markdown, PDF, DOCX and image OCR.
- Security scanning, SHA-256 fingerprints, duplicate detection and safe parsing.
- Arabic/English normalization, Arabic/English numeral normalization and synonym-based column mapping.
- Import profiles, reusable mappings, matching keys, conflict policies and null policies.
- Preview, validation, quarantine, chunked commit, progress, cancellation, resume and rollback.
- Cross-file intelligence and lineage.
- Data-quality scoring: completeness, validity, uniqueness, consistency, anomalies and overall score.
- Audit trail and operational observability.
- Performance architecture with pagination, server-side aggregation, lazy loading/code splitting, workers and caching.
- AI grounding / Zero-Hallucination layer: deterministic data engine first, explanation layer second.
- Local/offline-capable processing where specified by the existing architecture.
- Future operational integration boundary for Onyx Pro/SQL Server synchronization without coupling reporting logic to the source system.

## Execution order
### Phase A — Foundation and correctness
- Clean build/typecheck/lint.
- Verify routing and existing pages.
- Remove dead artifacts only after import/reference verification.
- Establish shared error, loading and empty states.
- Establish metric definitions and source lineage.

### Phase B — Unified Import Engine
- Move all bulk writes behind transactional/RPC import paths.
- Canonicalize matching keys (especially SKU).
- Preserve existing values when incoming fields are null/blank according to profile policy.
- Add preview classification and deterministic row results.
- Add job lifecycle, progress, cancellation/resume and rollback.
- Add lineage and quarantine.

### Phase C — Data Quality
- Implement production data-quality dashboard.
- Persist reports and expose field-level issues.
- Add duplicate/anomaly detection and remediation workflow.

### Phase D — Analytics and reports
- Move expensive aggregation from browser to database/server functions where appropriate.
- Ensure all reports use consistent metric definitions.
- Add filters, date ranges, branch/warehouse/category/customer dimensions and drill-down paths.

### Phase E — Decision intelligence
- Recommendations and alerts grounded in persisted metrics.
- Forecasts with model metadata, confidence and error measures.
- Scenario calculations remain deterministic.
- Explanation layer must cite the metrics/data used.

### Phase F — Security and audit
- Replace permissive production RLS with tenant-scoped policies.
- Add audit triggers/immutable audit records for sensitive operations.
- Remove production dependence on hardcoded tenant identity.

### Phase G — Performance and UX
- Worker-based parsing for heavy formats/OCR.
- Progressive processing and multi-file ingestion.
- Code splitting for PDF/OCR/XLSX-heavy modules.
- Pagination/virtualization for large tables.
- Mobile/RTL hardening.

### Phase H — Verification
- Unit tests for normalization, mapping, calculations and import classification.
- E2E tests for upload → preview → approve → commit → verify → rollback.
- Negative tests for malformed files, duplicate files, duplicate keys, missing required fields, permission failures and partial failures.
- Build/typecheck/lint verification before merge.

## Current known gaps carried into execution
- Import writes currently include direct bulk inserts in the UI and must be migrated to the unified engine.
- Production RLS is currently permissive and must be hardened.
- Analytics currently performs some large client-side calculations and must be progressively moved to efficient server-side aggregation.
- Data Quality and import intelligence require completion and end-to-end integration.
- The current dependency stack includes heavy PDF/OCR/XLSX packages and needs code splitting.

## Definition of done
A capability is DONE only when: UI exists, data path exists, persistence is correct, permissions are correct, errors are handled, performance is acceptable, and an acceptance test or verification artifact demonstrates the result.
