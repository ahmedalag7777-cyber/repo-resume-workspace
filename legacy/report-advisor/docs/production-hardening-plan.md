# Production Hardening Plan

## Scope
This document records the first production-hardening pass for Report-Advisor.

## Findings
- The repository is a Vite + React + TypeScript application with Supabase.
- The file-engine already supports XLSX/XLS/XLSM/ODS, CSV/TSV, JSON/JSONL, XML, TXT/Markdown, PDF, DOCX and image OCR, but the import UI still performs direct table inserts.
- The import schema already contains `import_jobs`, `import_job_rows`, `import_snapshots`, `file_records`, `import_profiles`, and `data_quality_reports`.
- Current RLS policies on the core and file-intelligence tables allow unrestricted anon/authenticated CRUD. This is acceptable only for a trusted local development environment and is not production-safe.
- Dashboard queries fetch large datasets to the browser and calculate KPIs client-side.

## Implementation priorities
1. Make import execution transactional and idempotent through database RPCs rather than direct bulk inserts.
2. Enforce normalized matching keys (especially SKU, customer code, invoice number) before UPSERT.
3. Add explicit import preview statistics: total, new, update, unchanged, duplicate, invalid, quarantined.
4. Add rollback using import snapshots/job lineage.
5. Replace open RLS policies with authenticated, company-scoped policies when authentication is introduced.
6. Move heavy parsing/normalization/OCR into Web Workers and lazy-load PDF/OCR libraries.
7. Add pagination/aggregation for analytics and dashboard queries.
8. Keep all analytical calculations deterministic and separate from any future LLM explanation layer.
9. Add automated build, typecheck, lint, and import-engine tests in CI.

## Acceptance criteria
- `npm run build`, `npm run typecheck`, and `npm run lint` pass.
- Importing the same file twice does not create duplicate business records when a matching key exists.
- Empty source cells never overwrite existing non-null target values unless an explicit null policy allows it.
- Every import row has lineage to the source file/job and a deterministic result.
- A failed import can be rolled back without deleting unrelated records.
- No production table is exposed through unrestricted anonymous CRUD.
