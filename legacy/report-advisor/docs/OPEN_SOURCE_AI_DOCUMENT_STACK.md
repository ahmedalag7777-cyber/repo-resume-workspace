# Open-source AI + Document Intelligence Stack

Report Advisor is **zero-local-install and free-first by default**.

Customers do not need Ollama, Python, model weights, CUDA, a local AI server, or a paid AI subscription.

## Cost policy — non-negotiable

1. **No paid inference is required for any core feature.**
2. The product never silently falls back from a free quota to pay-as-you-go billing.
3. Any hosted inference is optional and must be explicitly configured as a **project-owned free quota**.
4. If the free hosted quota is unavailable or exhausted, the system falls back to deterministic analytics and browser-capable/local optional engines.
5. Core reporting, importing, calculations, KPIs, forecasting gates, anomaly detection and evidence generation remain fully functional without an LLM.
6. API keys and billing credentials are never embedded in the customer browser.

Cloudflare Workers AI currently includes 10,000 Neurons/day on the Workers Free plan, while usage above the free allocation requires a paid plan. Therefore it may be used only as an explicitly bounded free-quota adapter, never as an unconditional production dependency. citeturn0search0turn0search8

Hugging Face Inference Providers currently gives Free users a small monthly credit, after which additional usage requires purchased credits. It is therefore **not** part of the default free runtime. citeturn0search1

OpenRouter and other pay-as-you-go gateways are not default dependencies. If a future administrator intentionally configures one, it must remain behind an explicit paid-inference feature flag; otherwise it is rejected.

## Runtime strategy

```text
FREE MODE (default)
        │
        ├── Deterministic analytics — always available
        ├── Browser-capable open models — optional, no API bill
        ├── Browser OCR / Tesseract.js — local
        └── Free hosted quota — optional and hard-capped

        X No silent paid fallback
        X No mandatory Ollama
        X No mandatory Python
```

### Deterministic-first

Business facts are calculated by the application's data/metric engines. AI only explains, summarizes, classifies or assists retrieval. If no free AI backend is available, the application still answers supported analytical questions using deterministic engines and reports insufficient data instead of inventing an answer.

### Browser AI

Browser AI is an optional enhancement for natural-language explanation and lightweight semantic tasks. It must be loaded only when requested and must not become a requirement for the core application. Models that are too large for a customer's device are never forced onto that device.

### Ollama

Ollama is supported only as an administrator/offline/power-user option. It is **never required** and never downloaded automatically. The official project supports local/offline execution, but its model weights can be large, so it is intentionally excluded from the customer default. citeturn0search5

## Selected capability stack

| Capability | Free default | Optional enhancement | Rule |
|---|---|---|---|
| Office/structured files | Existing XLSX/CSV/ODS engine | Polars/DuckDB adapters | Never send raw tables to an LLM |
| PDF/document parsing | Existing deterministic parser | Docling service | Structured layout before OCR |
| OCR | Tesseract.js / deterministic extraction | PaddleOCR service | Arabic is first-class |
| Chat/reasoning | Deterministic answer engine | Browser model / bounded free hosted model | LLM never creates numeric facts |
| Embeddings | Lexical/hashing retrieval | Browser embedding / bounded free hosted embedding | Hybrid retrieval for critical answers |
| Vector store | Existing Supabase/pgvector path | Local index | Tenant scope on every vector |
| Analytical SQL | Supabase + query planner | DuckDB adapter | Large aggregations use analytical engine |
| Dataframes | Existing deterministic TypeScript engine | Polars adapter | Parse once, transform deterministically |
| Forecasting | Existing deterministic engine | Python stats adapters | Data-quality gates mandatory |
| Anomaly detection | Deterministic metrics | PyOD/sklearn adapter | Evidence required |
| RAG | Evidence ledger + lexical/hybrid retrieval | Browser embeddings | Every answer retains lineage |
| Agents | Controlled tool registry | Browser/hosted reasoning | Allow-listed, tenant-scoped tools only |

## Document intelligence

Docling remains an optional accelerator for structured document parsing, PDF layout and tables. PaddleOCR remains an optional higher-accuracy multilingual OCR backend. Both are isolated behind the normalized document envelope. The browser application never requires either package to function.

## Security and privacy

1. Numeric business facts originate from deterministic data engines, never LLM text.
2. External AI receives only the minimum approved context; raw company data is not sent by default.
3. Every AI request is tenant-scoped and provider-policy checked.
4. API keys are server-side secrets, never embedded in the browser bundle.
5. OCR output is untrusted and must pass normalization/validation.
6. LLM output cannot directly write business tables.
7. Optional services fail closed to deterministic parsers/analytics.
8. File processing is bounded and parse-once.
9. Provider selection is capability-based.
10. No provider may silently activate paid billing.

## Deployment profiles

- **Customer:** free-first, zero installation.
- **Free hosted:** optional project-owned free quota with hard limits.
- **Private server:** self-hosted document intelligence and open models.
- **Offline:** deterministic analytics + browser/local optional engines; no network dependency.
