# Report Advisor — Master Requirements Traceability

This document is the execution guardrail derived from the comprehensive v3 specification and updated requirement tables. A screen is never considered implemented by appearance alone.

## Priority 1 — Foundation, ingestion and deterministic core

- Unified multi-format ingestion: XLSX multi-sheet, CSV, tabular/text PDF, Arabic/English numbers and dates, currency.
- Dataset classification and confidence.
- Automatic business relationship discovery: SKU, customer, supplier, account keys.
- Unit and packaging conversion.
- Preview + approval before import execution.
- Source authority and reconciliation.
- Historical state reconstruction.
- Null versus zero data-loss prevention.
- Business-key and persistent semantic dictionary.
- Deterministic query router and compute engine.
- Currency/FX and time intelligence.
- Data quality, coverage and completeness scoring.
- Cross-file linking and double-count prevention.
- Timeout, queue, chunking, cache and diagnostics.
- Anti-hallucination and regression tests.
- Offline resilience and Ollama independence.

## Priority 2 — Operational intelligence

- Commercial expert reasoning and automatic business diagnosis.
- Verified cost basis and explicit Profit Unavailable state.
- KPI definitions, formulas, required fields and windows.
- Returns, discounts, cancellations and unposted transactions.
- Inventory states: physical, available, reserved, damaged, blocked, sellable.
- Inventory values: cost, sales, liquid and dead stock.
- ABC / XYZ / FSN.
- Expiry and shelf-life intelligence where lot/batch dates exist.
- Aging: 0–30, 31–60, 61–90, 91–180, 180+.
- Trend: direction, velocity, acceleration, seasonality, volatility.
- Stockout and stochastic demand with minimum-data gates.
- Purchase routing: BUY NOW, BUY SOON, MONITOR, DO NOT BUY, OVERSTOCK.
- Sales/liquidation actions and price protection.
- Customer RFM, dynamic inactivity and churn risk.
- Supplier delivery, price and dependency scoring.
- Anomaly detection with evidence.

## Priority 3 — Financial and cash intelligence

- DSO, DIO, DPO, CCC.
- Separate bank, cashier, receivable, payable and liquidity concepts.
- 0/7/15/30/60/90-day cash projection and liquidity gaps.
- Receivables collection prioritization.
- Constraint-based liquidity allocation with operating cash reserve protection.
- Evidence-based supplier payment prioritization.
- Multi-level financial trends and seasonality.

## Priority 4 — Predictive, decision, memory and proactive intelligence

- Company/category/product/customer/supplier/cash-flow forecasting with minimum data thresholds.
- Backtesting: MAE/RMSE/MAPE and closed-loop quality tracking.
- Unified priority queue and confidence score.
- What-if scenarios and inaction impact.
- Opportunity intelligence.
- Analytical memory and historical snapshots.
- Proactive early warning and post-upload business diagnosis.
- Automatic business health report using verified data only.
- Optional isolated Onyx Pro dataset/sync.

## Mandatory acceptance rules

1. No mock KPI values in production paths.
2. No LLM-generated numeric facts.
3. No business write from an AI response without an explicit approved command path.
4. Every decision requires evidence/quality gates.
5. Every tenant-scoped operation carries company/tenant scope.
6. Import preview precedes execution for user-uploaded datasets.
7. Empty imported fields never silently overwrite existing values.
8. Exact business keys take precedence over internal UUIDs for matching.
9. PDF/OCR extraction must never invent rows; uncertain extraction becomes a review/error state.
10. AI quota exhaustion falls back to deterministic rules; it never silently starts paid usage.
11. Ollama is optional and never required for customers.
12. Every requirement is tracked as FULLY IMPLEMENTED, PARTIALLY IMPLEMENTED or NOT IMPLEMENTED until evidence exists.

## Definition of Done

A requirement is only FULLY IMPLEMENTED when its applicable UI, backend, database, security, audit, event/queue behavior, error/loading/offline state, tests, E2E/regression coverage, performance evidence and documentation are present.
