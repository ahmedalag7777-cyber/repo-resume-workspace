# Report-Advisor — Master Architecture & Product Direction

This document is the persistent implementation contract for the project. It consolidates the report specification and the useful architectural/UI ideas collected from the reviewed open-source projects.

## Product target

Report-Advisor is a Business Intelligence + Decision Intelligence + AI Agents + Research + Reporting + Inventory/Finance Intelligence platform.

Core principle: **Powerful under the hood, simple on the surface.**

## Non-negotiable principles

1. Deterministic engines are the source of truth for financial/operational calculations.
2. AI may investigate, explain, summarize, plan, rank and recommend, but must not invent financial figures.
3. Important outputs must be reproducible, auditable, traceable and explainable.
4. Every important recommendation should contain evidence, confidence, priority, action, expected impact and verification.
5. RTL/Arabic is first-class, not a cosmetic translation.
6. Prefer local/offline-first processing, caching, incremental work and small payloads where practical.
7. Preserve working implementation; extend and refactor safely rather than rebuilding blindly.

## Business intelligence

- Executive Cockpit / Situation Room.
- Dashboards with draggable/resizable widgets.
- Explore mode and visual query builder.
- Drill-down, drill-through and cross-filtering.
- Chat2BI: natural language -> semantic metric -> deterministic query -> validation -> visualization.
- Saved analyses, dashboards, report templates and versions.
- KPI, trend, comparison, ranking, distribution, forecast and anomaly visualizations.

## Inventory Liquidity & Velocity

- Moving/instant-sale inventory vs frozen/slow inventory.
- Average days-to-clear per SKU.
- Slow-movement liquidation plan.
- Best/worst selling products.
- Daily, weekly, half-monthly, monthly, half-yearly and yearly sales averages.

## Demand Forecasting & Reorder Engine

- Minimum stock, maximum stock and reorder point.
- Suggested purchase quantity for day/week/half-month/month horizons.
- Accurate Stockout Date.
- Forecast next week's high-demand products.
- Clear answers: what to buy, when to reorder, what to sell, and purchase priority.
- Incorporate velocity, seasonality/history, lead time and safety stock when data exists.

## Cash Flow & Liabilities

- Customer, supplier and bank/exchanger movement rankings.
- Obligation schedules: daily, weekly, half-monthly, monthly, half-yearly, yearly.
- Inactive customer detection and follow-up recommendations.
- Liquidity Crisis Engine: compare expected collections with supplier obligations and recommend collection priority, payment priority and cash allocation.

## Semantic Business Layer

Every important metric has:
- definition
- formula
- source
- owner
- permissions
- version
- last update
- validation/tests

Examples: Net Sales, Gross Profit, Inventory Velocity, Stock Coverage, Customer Activity, Supplier Exposure, Cash Position, Receivable Aging, Payable Aging.

## Real-time intelligence

Use a Business Event Bus concept:

`Business Event -> Metrics -> Alerts -> AI -> Dashboard -> Report -> Action -> Audit`

A sale can update inventory, velocity, forecast, stockout date, dashboards and alerts without rebuilding the whole dataset.

Track **Data Freshness** for every important dashboard/metric. AI must warn when recommendations rely on stale data.

## Alert and decision protocol

`Alert -> Evidence -> Investigation -> Recommendation -> Human Approval (when sensitive) -> Action -> Verification`

Sensitive operations such as payments, deletion, financial changes, bulk messaging and permission changes require human approval and audit.

## AI Agent platform

Agent Registry fields:
- role
- responsibilities
- tools
- permissions
- skills
- memory
- model
- output schema
- quality criteria
- version
- owner

Useful agents include sales analyst, inventory analyst, purchasing analyst, customer analyst, supplier analyst, finance/liquidity analyst, data-quality analyst, researcher, report designer, auditor and executive analyst.

AI task protocol:
`Understand -> Plan -> Execute -> Verify -> Review -> Deliver`

Agent observability should record model, tools, inputs, outputs, duration, tokens, errors, evidence, confidence and validation.

## Research and evidence

Research workflow:
`Question -> Planning -> Search -> Evidence -> Gap detection -> Verification -> Synthesis -> Report`

Important claims should be tied to sources/evidence when applicable.

## Report Studio

Reports are structured artifacts, not static HTML only:
- sections
- KPIs
- charts
- tables
- evidence
- calculations
- recommendations
- risks
- appendix

Support editing, drag/resize, templates, versioning, diff, rollback, print/PDF/Excel/CSV and scheduling.

## Data Engine

Use deterministic processing for:
- filtering
- grouping
- aggregation
- joins
- pivots
- rolling windows
- time series
- rankings
- statistics
- missing/duplicate detection
- outliers

Data transformations should be reusable Recipes:
`Input -> Normalize -> Map -> Transform -> Validate -> Output`.

Imports must have preview before execution with totals, new/update counts, errors, mapped/ignored columns and duplicates.

## Scaling

Small data: SQL/Pandas-style deterministic processing.
Medium data: optimized SQL/batch.
Large data: distributed processing when justified.

Apache Spark is an architectural reference for future scale; do not add it without a real workload requiring it.

Pathway-style incremental/stream processing is a reference for real-time pipelines.

## UI/UX Design System

References used for patterns: AdminLTE, ngx-admin, Gentelella, Vue Element Admin, shadcn-admin, Metabase, Superset, Grafana, Data Formulator, JimuReport and WorldMonitor.

Do not copy templates or branding. Build an original Report-Advisor design system.

Requirements:
- light/dark/system themes
- semantic design tokens
- consistent cards/buttons/inputs/tables/tabs/drawers/dialogs
- command palette (Ctrl+K)
- focus mode
- keyboard navigation
- responsive desktop/tablet/mobile layouts
- mobile tables become cards/detail views where necessary
- semantic status colors: good/monitor/action/risk/info/neutral

## Navigation model

- Home / Dashboard
- Executive Cockpit
- Business Intelligence
- Inventory & Sales Intelligence
- Finance & Liquidity
- AI & Decision
- Data & Quality
- Reports
- Customers / Products
- System / Audit

## Governance and security

- audit trail
- RBAC/permissions
- data provenance
- plugin/tool permissions
- Agent/Skill security gate
- sandbox potentially unsafe generated content/tools
- validate external dependencies and licenses before direct reuse

## Performance

- lazy loading
- incremental processing
- caching
- background jobs
- Web Workers where useful
- streaming where useful
- avoid loading entire datasets into the UI
- parse once and reuse
- avoid repeated calculations

## Reviewed project families

BI/visualization: Metabase, Apache Superset, Grafana, Data Formulator, JimuReport.

Data/scale: pandas, Apache Spark, Pathway, PandasAI.

AI/agents/research: Lobe Chat, STORM, Local Deep Researcher, LangChain, Dify, Langflow, Hermes Agent/Studio, Agency Agents, Superpowers, RagaAI-Catalyst.

Inventory/finance: InvenTree, Ledger.

Documents/data acquisition: PyMuPDF, Maxun, CyberChef.

NLP/content: funNLP, marketing/SEO skill projects.

UI/admin: AdminLTE, ngx-admin, Gentelella, Vue Element Admin, shadcn-admin, WorldMonitor/Open Design.

Security/quality: SkillSpector, ACRA, pentesting/report projects, code-quality-oriented references.

## Implementation rule

Before each major phase:
1. inspect existing implementation
2. identify reusable working code
3. define the smallest safe change
4. implement
5. typecheck/lint/build
6. inspect runtime/UX where possible
7. record what is complete and what remains

Never claim a feature is complete until it is actually wired, validated and reachable from the UI.
