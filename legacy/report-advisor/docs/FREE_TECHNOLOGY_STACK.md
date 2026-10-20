# Free / No-Subscription Technology Strategy

## Goal
Maximize analytical capability without requiring recurring subscriptions or paid AI APIs. External paid providers remain optional adapters, never hard dependencies for core calculations.

## Already usable in the application
- React + TypeScript + Vite: UI/runtime.
- Supabase/PostgreSQL: application data and RLS. Hosting plan may have limits; the architecture does not require a paid AI API.
- Recharts + Lucide: dashboards and UI icons.
- PDF.js: PDF text/document ingestion in browser.
- Mammoth: DOCX extraction.
- SheetJS/XLSX: spreadsheet ingestion/export.
- Tesseract.js: local OCR.
- date-fns: date/time normalization.

## Local analytical layer added
`src/lib/free-toolbox/` provides:
- descriptive statistics
- median/percentiles
- variance/stddev/CV
- correlation
- linear trend and R²
- EMA
- ABC analysis
- RFM scoring
- z-score anomaly detection
- dataset profiling
- completeness/duplicate/null checks
- local ensemble forecasting baseline

No API key, SaaS subscription, or hosted model is required for these calculations.

## High-value open-source options to integrate behind adapters
### DuckDB
Use for analytical SQL over CSV/Parquet/JSON and local OLAP. Prefer a WASM/browser adapter for interactive files and a server-side adapter for large jobs. Keep it optional so the existing app can still run without downloading a large analytical engine.

### Apache Arrow
Use as a columnar interchange format between ingestion, analytics, workers and export. Arrow reduces serialization overhead for large tables.

### Polars
Excellent high-performance DataFrame engine for local/server batch processing. Consider it for import jobs and large transformations where JavaScript memory becomes a bottleneck.

### PyMuPDF
Use in a server/worker environment for high-fidelity PDF text, metadata, page rendering and extraction. Browser PDF.js remains the zero-server fallback.

### Tesseract / EasyOCR / docTR
Keep Tesseract.js as the browser/offline baseline. Add Python OCR adapters only for server deployments that need higher throughput or specialized document models.

### Camelot / Tabula
Useful for PDF tables. Route structured PDFs through these extractors before OCR. Always retain the source page and extraction confidence for lineage.

### Pandas
Use for Python batch processing and interoperability, not as the only analytical engine. Prefer columnar/Polars paths for high-volume workloads.

### scikit-learn
Free/open-source classical ML layer for clustering, regression, anomaly detection and model evaluation. Use only after deterministic baselines are established.

### statsmodels
Free/open-source statistical modeling for interpretable time-series/regression methods. Good for demand and financial forecasting where explainability matters.

### Prophet / sktime
Optional forecasting adapters. Every model must be benchmarked against the built-in baseline using rolling backtests before being promoted.

### MLflow
Optional local model registry/experiment tracking. Useful when multiple forecasting models are evaluated over time.

### Great Expectations / Evidently
Optional data-quality and model-monitoring adapters. Use lightweight built-in profiling first; deploy these when governance requirements justify the extra runtime.

### OpenTelemetry
Free/open standard for traces/metrics/logs. Instrument import, report execution, forecasting and AI latency without sending business payloads to third parties.

### MinIO
Optional self-hosted S3-compatible object storage for private deployments. Useful when customers need on-premise/private files without a proprietary cloud storage dependency.

### Redis / Valkey
Optional queue/cache layer for production workers. Valkey is preferred where an OSI-licensed Redis-compatible implementation is desired. Every cache key remains tenant-scoped.

### Apache Superset / Metabase / Grafana
Do not embed their whole products into the application by default. Borrow proven BI interaction patterns and optionally provide connector/export integration for customers that already operate them. The Report-Advisor UI remains the primary product surface.

### Apache Spark
Reserve for very large distributed batch workloads. It is not justified for ordinary SMB datasets and would add operational complexity.

## AI without subscription dependency
Use a provider abstraction:

`AIProvider = local | optional_external`

Local-first options can include Ollama-compatible local models, llama.cpp-compatible runtimes, or other customer-hosted open-weight models. The deterministic analytics engine remains authoritative for numerical facts.

AI may explain, summarize, rank and propose actions, but it must not invent numerical values. Every generated KPI/recommendation should carry metric IDs, source periods and calculation provenance.

## Technologies deliberately not treated as free core dependencies
Google Gemini, OpenAI, Microsoft Fabric/Power BI, Tableau/Einstein, SAP Analytics Cloud and similar commercial services may be supported through adapters, but they must never be required to calculate core reports.

## Architecture
```text
Files / ERP
    ↓
Ingestion adapters (XLSX/PDF/DOCX/OCR)
    ↓
Canonical schema + quality profiler
    ↓
Columnar/local analytics (built-in / DuckDB / Polars / Arrow)
    ↓
Semantic metrics
    ↓
Deterministic engines
  ├─ Inventory
  ├─ Forecast
  ├─ Cashflow
  ├─ ABC/RFM
  └─ Anomaly detection
    ↓
Decision engine
    ↓
Optional local AI explanation
    ↓
Reports / dashboards / automation
```

## Rule
A feature should be implemented locally first when it is deterministic, auditable and computationally reasonable. Paid services are acceleration/scale options, not correctness dependencies.
