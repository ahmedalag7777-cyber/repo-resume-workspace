# Report Advisor — Product Inspiration Matrix (Canonicalized)

> **CANONICAL SOURCE NOTICE — 2026-08-21**
>
> This file is retained for traceability and historical source attribution, but it is **NOT a second master reference**.
>
> The sole operational reference for Report Advisor requirements, product inspiration, open-source technology, architecture decisions, licensing boundaries, acceptance rules, implementation status and release gates is:
>
> **`docs/MASTER_PRODUCT_REFERENCE.md`**
>
> All useful content from this matrix is represented in that master reference. Future additions MUST be recorded in the master reference first. This file must not become a competing checklist.

## 1. What was absorbed into the Master Reference

The original matrix was reviewed and its useful patterns are now treated as part of the canonical product capability model:

- Governed intelligence and one canonical metric definition.
- Evidence attached to important answers.
- Explicit distinction between calculated, estimated, unavailable and uncertain values.
- Visible lineage/provenance without forcing users into technical screens.
- Ask → Inspect → Act.
- Deterministic execution behind natural-language analytics.
- Decision queue instead of alert spam.
- Impact/urgency/confidence prioritization.
- Snooze, dismiss, investigate and execute workflows where appropriate.
- Command Palette / Ctrl+K / keyboard-first power workflows.
- Saved views, filters, grouping and canonical reset.
- Executive cockpit with high-signal KPIs, trends, risks, opportunities and actions.
- Spreadsheet-grade exploration without semantic fragility.
- Column visibility, sorting, filtering, grouping and policy-controlled export.
- Multi-format document intelligence.
- Document-type detection before extraction.
- Native text/table extraction before OCR.
- OCR only where needed.
- Page/table/cell evidence.
- Uncertain extraction → review rather than invention.
- Connected knowledge workspace for reports, datasets, definitions, decisions and evidence.
- Progressive disclosure.
- Responsive, fast and low-bandwidth UX.
- Skeleton states, lazy loading, parse-once/reuse-many, safe caching and dataset minimization.
- Financial safety rails.
- Protected operating cash reserve.
- Receivable collection ranking.
- Supplier payment prioritization constrained by liquidity.
- Forecast minimum-data gates, confidence and backtesting.
- Explainable forecast unavailability.

## 2. Design synthesis absorbed into the Master Reference

The design principles are generalized rather than copied:

- Calm, information-first visual hierarchy.
- Restrained primary accent.
- Semantic status colors only when they communicate meaning.
- Compact data-dense cards with clear grouping and whitespace.
- Consistent radius, border and shadow language.
- RTL-first Arabic presentation with LTR contexts for numbers, code and technical data.
- Charts optimized for decisions rather than decoration.
- Tables optimized for **scan → filter → inspect → act**.
- Mobile-first and low-bandwidth behavior.
- Accessibility and keyboard-first workflows.

## 3. Source corpus retained for attribution

The original matrix reviewed these product families and projects:

### BI / Analytics
Power BI, Tableau, Looker, Qlik Sense, ThoughtSpot, Metabase, Apache Superset, Sigma, Preset, Grafana, Zoho Analytics, Domo, Sisense, Omni, Lightdash.

### AI Analytics / Research
Hex, Julius AI, Akkio, Databricks AI/BI, Pecan AI, STORM / local deep-research patterns, Streamlit.

### ERP / Accounting / Operations
Odoo, ERPNext, QuickBooks, Xero, Zoho Books, NetSuite, Cin7, Katana.

### Productivity / UX
Linear, Notion, Stripe, Vercel.

### Document / AI applications
Docling, PaddleOCR, Unstructured, Open WebUI, Dify, Flowise, Langflow.

These are **reference sources only**. They do not authorize copying proprietary code, branding, assets, layouts, closed APIs or paid services.

## 4. Decision rule

A source pattern enters Report Advisor only when it provides measurable positive value without violating the Master Reference invariants.

Evaluate:

`value = accuracy + capability + UX + performance + maintainability`

against:

`cost = complexity + runtime weight + maintenance + licensing risk + security risk + vendor lock-in`

Then classify it as:

- **NATIVE** — implement directly when small, deterministic and lightweight.
- **ADAPTER** — isolate an open-source engine behind a replaceable boundary.
- **OPTIONAL SERVICE** — use only for heavy workloads that should not burden customers.
- **REFERENCE ONLY** — use the product/interaction lesson without shipping its code.
- **REJECT** — insufficient value, unsafe, incompatible, restrictive or duplicative.

## 5. Non-negotiable boundaries

Never adopt an inspiration pattern if it:

- reduces numerical correctness;
- permits hallucinated business facts;
- makes paid AI mandatory;
- makes local model installation mandatory for customers;
- adds a large runtime/download when a lighter path exists;
- weakens RLS, tenant isolation, auditability or lineage;
- performs authoritative financial calculations inside an LLM;
- silently overwrites verified data;
- invents uncertain OCR/PDF values;
- introduces unsafe licensing into the core;
- copies proprietary implementation, UI, branding or assets;
- creates a second conflicting source of truth.

## 6. Maintenance protocol

When a new site, product, GitHub repository, open-source library or technical approach is reviewed:

1. Record it in `docs/MASTER_PRODUCT_REFERENCE.md`.
2. Record the useful pattern/capability.
3. Record licensing information or uncertainty.
4. Record the decision: Native / Adapter / Optional Service / Reference / Reject.
5. Connect the capability to implementation and acceptance tests.
6. Do not create another master list.

## 7. Historical content

The previous detailed matrix is intentionally collapsed into the Master Reference to prevent drift. This file remains only as a traceability pointer and source-family index.
