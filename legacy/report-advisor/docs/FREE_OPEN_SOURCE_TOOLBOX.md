# Report-Advisor — Free & Open-Source Intelligence Toolbox

> This document is an architectural shortlist, not a mandate to embed every project. Prefer native TypeScript/Supabase implementations when they are lighter; use external engines behind adapters when they add material capability.

## 1. BI and visualization

### Apache Superset — Apache-2.0
Use as a reference for: SQL Lab, dataset exploration, chart grammar, dashboard composition, cross-filtering, native filters, alerts/reports, caching, database connectors and semantic-style dataset metadata.
Integration decision: do not embed the whole platform initially. Reproduce the best interaction patterns in our own React UI and optionally use Superset as an external analyst workspace.

### Metabase — AGPL-3.0
Use as a reference for: self-service questions, query builder, drill-through, simple metrics, dashboard sharing, subscriptions and friendly non-technical UX.
Integration decision: borrow UX patterns; avoid copying licensed code. If deployed as a separate service, isolate it behind a connector.

### Redash — BSD-2-Clause
Use for: SQL-first analyst workflows, query snippets, parameterized queries, query results, visualizations and sharing. Good reference for an advanced SQL workbench. BSD license confirmed from the upstream repository.

### Grafana — AGPL-3.0
Use for: time-series panels, operational monitoring, alert states, annotations, dashboard variables and real-time status. Best applied to system/data freshness observability rather than replacing the business BI UI.

### Lightdash — MIT for core portions; EE/source-available areas must be checked separately
Use for: dbt-oriented metrics, governed dimensions/measures, semantic consistency and analyst exploration. Do not assume all repository code is permissively licensed; keep core concepts separate from EE code.

## 2. Analytical engines

### DuckDB — MIT
Use as the local analytical engine for CSV/Parquet/Excel-derived datasets and large ad-hoc computations without loading everything into PostgreSQL. Ideal for privacy-first/offline analysis and fast previews.

### Apache Arrow / Parquet — Apache-2.0 ecosystem
Use columnar interchange for large imported datasets, cached analytical snapshots and worker-to-worker data transfer. Prefer Arrow/Parquet over JSON for large internal analytical payloads.

### Polars — MIT
Use for fast dataframe transformations, lazy execution, streaming and memory-efficient ETL where Python/Pandas becomes expensive. Candidate for a server/worker data engine.

### pandas — BSD-3-Clause
Use for mature tabular operations, Excel/CSV interoperability, statistical profiling and transformation. Keep it in a Python worker/service rather than the browser for large datasets.

### Apache Spark — Apache-2.0
Use only when scale justifies distributed processing. Valuable future adapter for very large historical datasets, batch pipelines and streaming. Not necessary for the current core deployment.

### Trino — Apache-2.0
Use later as a federated SQL layer when data spans PostgreSQL, files, warehouses or external sources. Avoid introducing it before there is a real multi-source need.

## 3. Data science / ML / experimentation

### MLflow — Apache-2.0
Use for model/version tracking, evaluation, traces, prompts, agent/LLM observability and reproducible forecasting experiments. Particularly useful when Demand Forecasting moves from deterministic baselines to learned models.

### Orange Data Mining — GPL family
Use as a reference for visual analytical workflows, feature exploration, clustering, classification and model evaluation. Prefer its ideas/workflow model rather than embedding the application.

### KNIME — open-source core with ecosystem/licensing boundaries
Use as a reference for visual ETL/workflow composition, reusable nodes, Python/R integration and repeatable analytical pipelines. Verify individual extension licenses before redistribution.

### TensorBoard — Apache-2.0
Use for model training/evaluation diagnostics if local ML models are introduced. Not a user-facing business dashboard.

## 4. Document and table extraction

### Apache Tika — Apache-2.0
Use as a document ingestion adapter for MIME detection, metadata and text extraction across PDF, Office and many other formats. Valuable before OCR so native text is preferred when available.

### PyMuPDF — AGPL/commercial dual licensing
Use for high-performance PDF rendering, text extraction, page inspection, bounding boxes and image extraction. Because AGPL/commercial licensing matters, isolate it in an optional service and do not silently treat it as MIT/Apache software.

### Camelot — MIT
Use for structured PDF table extraction when the PDF contains extractable tables. Pair with page geometry, confidence scoring and fallback extraction. Current upstream repository states MIT.

### Tabula — MIT (Java project)
Use as a reference/optional backend for extracting ruled/positioned PDF tables. Best for born-digital PDFs; scanned documents require OCR first.

## 5. OCR and document AI

### Tesseract OCR — Apache-2.0
Use as the default offline OCR fallback, especially for Arabic/English documents. Keep preprocessing and confidence scoring around it.

### EasyOCR — Apache-2.0
Use as an alternative OCR backend for multilingual images and difficult layouts. The upstream project documents 80+ languages including Arabic.

### docTR — Apache-2.0
Use for neural document text detection/recognition and page-level structure. Strong candidate for a higher-accuracy document ingestion mode. Current upstream repository is Apache-2.0.

### OpenCV — Apache-2.0
Use before OCR: deskew, denoise, thresholding, perspective correction, cropping and barcode/visual preprocessing.

## 6. Product / behavior analytics

### PostHog — MIT core with separately licensed EE code
Use selectively for product analytics, funnels, retention, feature flags, session/product telemetry and experiments. Do not assume the entire repository is MIT; the upstream repository explicitly separates EE licensing.

## 7. AI / agent architecture

### LangChain — MIT
Use adapters for model/tool routing, structured outputs, retrieval, agents and evaluation. Keep business calculations outside the LLM.

### LangGraph — MIT
Use for durable stateful AI workflows: research, report generation, reconciliation and multi-step decision processes. Prefer explicit state machines over free-form autonomous agents for financial operations.

### Dify — Apache-2.0 for core project with product-specific licensing considerations
Use as a reference for visual AI applications, datasets, knowledge bases, workflows, model routing and observability. Do not copy UI/code without checking the exact license of the component.

### Langflow — MIT
Use as a reference for visual composition of LLM/RAG workflows and tool chains. Candidate for an optional internal workflow builder.

### STORM / Local Deep Researcher — open-source research patterns
Use the ideas: multi-source research, planning before retrieval, source grounding, claim/evidence mapping and synthesis. Never allow generated claims without evidence in financial reports.

## 8. Core architecture patterns to adopt

1. **Semantic layer first:** every important KPI has one canonical definition.
2. **Evidence-first AI:** every AI-generated conclusion carries metric/source/time-window/evidence metadata.
3. **Deterministic calculations:** money, stock, liabilities, reorder quantities and dates are computed by code/SQL, not guessed by an LLM.
4. **Progressive engines:** browser for small datasets; DuckDB/worker for medium datasets; Python/Polars for heavier ETL; Spark/Trino only when scale requires it.
5. **Adapter architecture:** OCR, PDF extraction, forecasting and AI providers must be replaceable.
6. **Local-first:** allow sensitive files and analysis to remain local whenever possible.
7. **Parse once, reuse many times:** cache normalized document/table representations.
8. **Confidence everywhere:** extraction confidence, mapping confidence, forecast confidence and answer confidence.
9. **Data freshness:** show when each metric was last updated and whether it is stale.
10. **Lineage:** Data source → transformation → metric → visualization/report/decision.
11. **Observability:** measure import failures, query latency, model latency, stale data and alert delivery.
12. **Human approval:** financial actions, supplier payment plans and purchase orders require confirmation unless explicitly configured otherwise.

## 9. Priority for Report-Advisor

### P0 — integrate now
- DuckDB adapter for local analytical files.
- Apache Arrow/Parquet cache format.
- OpenCV + Tesseract/EasyOCR fallback chain.
- Apache Tika/PyMuPDF/Camelot ingestion adapters with license isolation.
- Semantic metrics + lineage + freshness.
- Deterministic alerts and decision engine.
- Evidence-backed Chat2BI.

### P1 — next
- Polars/Pandas analytical worker.
- MLflow evaluation/forecast registry.
- Advanced report builder inspired by Superset/Metabase/JimuReport.
- Grafana-style operational monitoring concepts.
- PostHog-style product funnel/retention analytics if product telemetry is desired.

### P2 — scale only when needed
- Trino federation.
- Spark distributed processing.
- Dedicated Lightdash-style dbt workflow.
- Advanced learned forecasting models.

## 10. Licensing rule

Before embedding or copying code, inspect the exact license of the file/component, not only the repository headline. Prefer permissive MIT/Apache/BSD components for code that becomes part of the proprietary Report-Advisor product. For AGPL/GPL/source-available or dual-licensed projects, use them as architectural references or isolate them as separately deployed services unless legal review approves another approach.
