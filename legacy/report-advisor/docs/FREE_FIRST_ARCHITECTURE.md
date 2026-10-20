# Free-First Architecture Contract

Report-Advisor must remain fully usable without paid AI APIs, paid BI SaaS, or mandatory external subscriptions.

## Priority order
1. Deterministic local computation.
2. Browser/Web Worker computation for suitable datasets.
3. Self-hosted/open-source services for heavier workloads.
4. Local AI models when available.
5. External paid providers only as optional adapters, never as a core dependency.

## Free analytical stack
- TypeScript + Web Workers for interactive client-side transforms.
- XLSX/PDF/DOCX parsers already present in the application.
- Tesseract.js for local OCR.
- Recharts for visualization.
- Local statistical primitives in `src/lib/free-toolbox`.
- Optional DuckDB-WASM/Apache Arrow/Polars integration when dataset size justifies it.
- PostgreSQL/Supabase-compatible storage for the core data model, with a self-hosted PostgreSQL path for customers who want zero hosted SaaS dependency.

## AI contract
AI must never be the source of truth for financial, inventory, or KPI numbers. Engines calculate numbers; AI explains, summarizes, asks questions, and proposes actions.

Recommended local path:
`structured metrics -> deterministic engine -> optional local model -> explanation/action`

## Forecasting contract
Forecast models are evaluated against deterministic baselines (naive, moving average, EMA, trend). A more complex model may only become the preferred model after backtesting demonstrates improvement using MAE/MAPE or another documented metric.

## No mandatory paid services
The product must continue to function when all external AI/API credentials are absent. Feature gates may disable optional integrations, but core ingestion, analytics, reports, inventory calculations, cashflow calculations, exports, and deterministic recommendations must remain operational.

## Commercial licensing gate
Before adding an open-source dependency to the distributable product, verify its current license and whether the planned use is compatible with commercial distribution. Do not assume that open source means unrestricted commercial use.

## Resource-aware operation
The application should automatically choose between browser/local/server execution according to dataset size, available memory, CPU, and feature requirements. Small files should stay local to reduce latency and data exposure.
