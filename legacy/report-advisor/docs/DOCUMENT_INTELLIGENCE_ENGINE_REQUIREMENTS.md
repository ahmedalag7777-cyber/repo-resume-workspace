# Internal Document & Data Intelligence Engine — Canonical Requirements

## Purpose

Build an internal, provider-neutral engine that accepts structured, unstructured, random, scanned, and image-based files; discovers their structure; extracts and preserves all source data; understands fields semantically; normalizes and validates values; resolves entities; reconciles mathematical/business relationships; records confidence and provenance; and routes only validated/approved canonical data into application modules.

## Non-negotiable data-truth rules

- Raw files are never consumed directly by reporting, analytics, forecasting, recommendation, or accounting services.
- Unknown does not mean ignored: unrecognized fields remain preserved with provenance and `UNKNOWN` status.
- Original, normalized, and derived values remain distinguishable.
- Missing values are `NULL/UNKNOWN`, never invented.
- Financial truth comes from validated canonical data, not an LLM or OCR guess.
- Critical fields can block approval; low-criticality uncertainty should not unnecessarily block the whole import.

## Canonical pipeline

`RAW FILE → Security/Integrity → File Inspection → Document/Page Classification → Processing Router → Direct Parser/OCR/Layout/Table Extraction → Structured Intermediate Model → Extract Everything → Column/Field Discovery → Semantic Understanding → Normalization → Smart Mapping → Entity Resolution → Mathematical Inference → Business Rules → Validation → Reconciliation → Confidence → Approved/Review/Quarantine → Canonical Database → Automatic Routing → Reports/Analytics/Forecasting/Recommendations/Alerts`

## Schema-agnostic discovery

The engine must not require a fixed template, schema, header name, or column count. It must discover tables, pages, rows, columns, hidden/semi-empty fields where technically possible, multi-line headers, repeated headers, merged cells, multi-table documents, and tables spanning pages.

Every column receives a profile containing at least: source index/header, data type, completeness/uniqueness ratios, numeric/date/text patterns, statistics, candidate meanings, relationships, mathematical evidence, final candidate, confidence, criticality, and provenance.

Semantic mapping uses multi-evidence reasoning: header, cell content, data type, patterns, neighboring/contextual columns, Arabic/English synonyms, statistics, row structure, relationships, and mathematical consistency. Evidence outranks a conflicting header.

## Extraction adapters

Use an abstract provider boundary. Candidate engines include:

- PDF: PyMuPDF, pdfplumber, Docling.
- Scanned/image: PaddleOCR/PP-OCR, RapidOCR, Tesseract, OpenCV, layout/table recognition.
- Excel/CSV: openpyxl, pandas, LibreOffice where justified.
- DOCX: parser preserving paragraphs, tables, headings, lists, styles, and metadata.

Adaptive routing must use the cheapest reliable method first and escalate only when confidence or document complexity requires it. Heavy/local engines remain optional adapters.

## Intermediate representation and provenance

Create a provider-neutral document model containing metadata, pages, blocks, tables, rows, cells, images, text, and provenance. Preserve cell-level lineage: source file, page, sheet, table, row, column, cell, bounding box where available, source text, normalized value, and confidence.

Every downstream record should be traceable back through normalized/derived data to the extracted source location and original file version. Record parser/OCR/mapping/rules/schema versions.

## Canonical schema and routing

External column names never define database structure. Map to canonical semantic fields such as product code/name, barcode, quantity, unit, unit price, discount, tax, totals, customer/supplier, invoice number/date, warehouse, and currency as applicable.

Routing is semantic, not string-equality based:

`Extracted Field → Canonical Field → Business Entity → Database Table → Destination Module`

One canonical entity may serve multiple consumers without creating conflicting copies.

## Normalization

Support Arabic/English mixed text, Arabic and Latin digits, punctuation/spacing variants, common OCR errors, numeric separators, negatives, parentheses, percentages, currencies, Gregorian/Hijri dates where required, Excel serial dates, and business units. Always retain the original source value.

Maintain an extensible Arabic/English synonym and abbreviation dictionary. User-approved mappings may become optional company rules.

## Entity resolution and deduplication

Resolve products, customers, suppliers, invoices, and documents using exact/strong/weak/no-match stages. Weak matches go to review. Prevent duplicates with document fingerprints, SHA-256, business identifiers, source combinations, and idempotency keys.

## Mathematical/business validation

Use relationships as evidence, not as a license to invent values. Examples include quantity × unit price ≈ subtotal, subtotal + tax − discount ≈ total, opening + inflow − outflow ≈ closing, and inventory movement reconciliation. Support absolute/relative tolerances, rounding, currency precision, excluded/cancelled rows, and configurable company rules.

Validate completeness, accuracy, consistency, uniqueness, validity, and referential integrity.

## Confidence, review, quarantine

Track document, page, table, row, cell, field, mapping, entity, and validation confidence separately. Thresholds must be configurable and criticality-aware. Typical policy: high confidence auto-approves; medium confidence requests focused review; low confidence quarantines. Review only the uncertain decision rather than forcing manual remapping of the whole document.

Quarantine preserves value, source location, reason, expected value if known, confidence, suggestion, and reprocessing capability.

## Transactional lifecycle

`Raw → Extracted → Staging → Validated → Reconciled → Approved → Production`

Production writes must be transactional and rollback-safe. Bulk imports use the existing unified import/upsert governance rather than bypassing it.

## Reprocessing and jobs

Persist processing metadata so a prior source can be reprocessed after mapping/rule/OCR/entity changes without requiring a new upload. Background work must support queued/processing/validating/reconciling/completed/failed/retry/quarantined states with bounded retries, backoff, and dead-letter handling. Large documents may be processed in bounded parallel chunks while preserving source ordering and lineage.

## Security and storage

Validate MIME/type and size, use safe temporary directories, protect against archive/path traversal abuse and resource exhaustion, optionally malware-scan, never execute uploaded files, and isolate parser/OCR workers. Keep raw/extracted/processed/quarantine/approved/export concerns separated. Raw bytes should not be persisted by the parser service unless an explicit storage policy requires it.

## Tenant and database requirements

Canonical records must remain compatible with multi-company, branch, warehouse, user, role, and currency scope. Source tracking fields should include source file/document/page/table/row/column/cell/hash and processing version where applicable. Tenant/security policy is a release blocker, not an optional enhancement.

## Onyx and future adapters

Onyx Pro must enter through an adapter into the same canonical pipeline. The adapter boundary must also allow future ERP/POS/Excel/CSV sources without duplicating business logic.

## UX

The default flow is: upload → inspect → discover → understand → map → validate → reconcile → route → show only decisions requiring review → approve. Progress should expose meaningful stages without forcing users through unnecessary mapping dialogs.

## Observability

Monitor queue/workers, storage/database, parser/OCR/import/analytics services, processing durations, failure/retry rates, confidence, quarantine volume, and resource usage. Preserve evidence for debugging and audits.

## Testing and acceptance

Required coverage: unit, integration, pipeline, OCR, mapping, accounting/business rules, regression, security, and load tests. Maintain a golden dataset covering Arabic/English PDFs, scanned PDFs, Excel, CSV, images, invoices, Onyx reports, complex/merged tables, poor-quality files, no-header files, random schemas, and 30+ column files.

Measure extraction/field/cell accuracy, mapping accuracy, entity-resolution precision/recall, and reconciliation accuracy. A feature is not complete merely because a file uploads or text is extracted; all preservation, provenance, validation, routing, and safety gates must pass.

## Implementation constraint

Implement this as one internal engine with explicit interfaces such as `OCRProvider`, `TableExtractor`, `DocumentParser`, `EntityResolver`, and `ValidationEngine`. Do not scatter provider-specific logic through import/report code. Preserve the existing production UI and query surfaces unless a measured, tested integration proves a replacement is superior.
