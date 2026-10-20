# External Projects Knowledge Base — Projects 003–009

This addendum extends the cumulative external-project research for Report-Advisor. The goal is to extract transferable engineering patterns and product capabilities, not copy unrelated code.

## 003 — Chuyu-Team/Dism-Multi-language
License: MIT. The repository is primarily a localization/resource and support project. It maintains many language resource files, website/help translations, and a structured rules/data file for cleanup and optimization. It also contains a crash-analysis backend. fileciteturn54file0L2-L2

### Adopt
- Resource-driven localization instead of hard-coded UI strings.
- Language packs and fallback hierarchy.
- RTL/Arabic-specific translation QA.
- Versioned terminology/glossary resources.
- Help/documentation localization tied to the same translation resources.
- Structured rules engine pattern: configurable business/data-cleaning rules rather than hard-coded behavior.
- Crash/error telemetry with privacy-aware aggregation.
- Translation contributor/review workflow and provenance.

### Report-Advisor adaptation
Create a `Localization Registry` and `Terminology Registry` for Arabic/English, including metric names, accounting terms, synonyms and pluralization. Add configurable `Data Rules` that can be versioned, tested, enabled/disabled and scoped by company/profile.

## 004 — MuseScore/MuseScore
Large C++/Qt desktop product for music notation, with structured document editing, playback/rendering, import/export and extensive UI architecture. It is not a direct business analytics dependency. fileciteturn46file0L2-L2

### Adopt
- Rich structured-document model rather than treating reports as flat HTML.
- Component-based editing of complex documents.
- Separation of document model, rendering/presentation and interaction.
- High-quality print/export workflows.
- Undo/redo and revision-oriented editing for report workspaces.
- Keyboard shortcuts and command palette patterns for power users.
- Long-running operation progress/cancellation.
- Deterministic rendering from a structured report model.

### Report-Advisor adaptation
Build reports as a structured `Report Document Model`: sections, metrics, tables, charts, evidence blocks, recommendations, footnotes and metadata. Support section-level regeneration, editing, undo/version history, print preview and export.

## 005 — vdumoulin/conv_arithmetic
MIT-licensed technical report explaining convolution arithmetic in deep learning, with visual/technical material rather than a business application. It is archived. fileciteturn47file0L2-L2

### Adopt
- Make complex analytical algorithms explainable through visual, step-by-step computation.
- Provide an `Explain Calculation` mode showing input window, transformation, intermediate values and output.
- Document forecasting/ML assumptions mathematically and visually.
- Include edge-case examples and reproducible demonstrations in the analytics documentation.

### Report-Advisor adaptation
For forecasting, anomaly detection and statistical calculations, add a transparent calculation inspector so users can understand how a value was produced without exposing internal model chain-of-thought.

## 006 — AgriciDaniel/claude-seo
MIT-licensed AI SEO system with 25 sub-skills and 18 specialist agents, parallel execution, prioritized action plans, evidence-based/falsifiable recommendations, multiple data providers, scheduled/drift monitoring and PDF/Excel reporting. fileciteturn48file0L2-L2 fileciteturn53file0L2-L2

### Adopt
- Specialist sub-skills/agents with a central orchestrator.
- Parallel independent analysis with aggregation.
- Prioritized action plans rather than raw findings.
- Every recommendation stores the observation it depends on.
- Falsifiability: explicit `How would we know this recommendation failed?` check.
- Leading indicators for recommendations.
- Deterministic scoring from 0–100 where appropriate, with score decomposition.
- Tiered external integrations and graceful degradation when credentials are absent.
- Doctor/readiness command concept for system dependencies.
- Snapshot-based drift detection: baseline → compare → history.
- Competitor/peer comparison concepts where relevant to business analytics.
- Structured reporting to PDF/Excel.
- Strong automated test coverage and isolated runtime/dependencies.

### Report-Advisor adaptation
Every recommendation should contain: observation, evidence, severity/priority, expected impact, dependency, owner, action, success metric, leading indicator, failure criterion, due date and status. Add drift snapshots for business KPIs, data quality, inventory velocity and cash-flow risk.

## 007 — QuestPDF/QuestPDF
Modern component-based PDF generation library with structured layouts, dynamic content, reusable components, RTL/bidi and multilingual support, high-performance rendering, PDF operations, metadata, encryption, PDF/A and PDF/UA capabilities. The repository currently uses a non-standard/commercial community licensing model; do not copy source code or dependency assumptions without a legal review. fileciteturn49file0L2-L2 fileciteturn52file0L2-L2

### Adopt as architecture concepts, not source code
- Structured component-based document renderer.
- Reusable report components.
- Automatic pagination and repeatable headers/footers.
- RTL/bidi and font fallback.
- Large-document streaming/lazy rendering.
- PDF metadata and document security policies.
- PDF/A archival and PDF/UA accessibility targets where supported by the chosen implementation.
- Merge/split/overlay/attachment operations.
- Pixel-consistent print layouts and preview.
- Report templates with strongly typed data contracts.
- Local/offline generation for sensitive business data.

### Report-Advisor adaptation
Create a report renderer abstraction so the same Report Document Model can produce HTML/interactive view, PDF and Excel. Prefer existing TypeScript-compatible/open components unless a separately reviewed commercial library is selected.

## 008 — github-linguist/linguist
MIT project used by GitHub to detect languages, ignore binary/vendor files, suppress generated files in diffs, and produce language/file breakdowns. It exposes repository/file modes, detection strategies, JSON output and overrides. fileciteturn55file0L2-L2

### Adopt
- File classification pipeline: type → encoding → semantic category → parser.
- Detection strategy transparency: show why a file was classified a certain way.
- Override rules for ambiguous files.
- Binary/generated/vendor classification.
- JSON machine-readable diagnostics.
- Repository-level and single-file analysis modes.
- Statistics and breakdowns.

### Report-Advisor adaptation
Upgrade Universal Import to use a `File Intelligence` stage that classifies format/encoding/binary/generated/document/data/table/image/PDF before parsing. Store detection strategy and confidence. Allow Import Profiles to override detection safely. Expose machine-readable diagnostics and a human-readable explanation of why a parser/mapping was selected.

## 009 — 1N3/Sn1per
Security/attack-surface management platform. The repository describes workspace-based asset organization, continuous/differential scanning, scheduled jobs, reporting/export, JSON API, modular integrations and result/loot reimport. Because this domain includes offensive-security capabilities and the repository has a non-standard/custom EULA, Report-Advisor adopts only defensive architecture patterns, not exploitation or attack tooling. fileciteturn51file0L2-L2 fileciteturn56file0L2-L2

### Safe adopt
- Workspace/engagement isolation and fast context switching.
- Asset registry with ownership/scope.
- Scheduled recurring scans/jobs.
- Baseline → rescan → diff → alert workflow.
- Modular provider/integration adapters.
- Reimport/reconciliation of external results.
- Centralized findings dashboard.
- Status/progress/resume for long-running jobs.
- JSON API for automation.
- CSV/Excel/PDF export.
- Quick-action command panels.
- Operational health and debug modes.

### Report-Advisor adaptation
Create an `Analysis Workspace` model: saved scope, filters, selected entities, time windows, reports, agent runs, baselines and findings. Add scheduled analytics with differential comparison and alerts. Add provider adapters for external financial/operational sources. Do not add offensive scanning/exploitation modules.

# Cross-project synthesis — new master architecture

## A. Universal Evidence & Analysis Pipeline
`Input/File/API → Classification → Validation → Normalization → Metric/Feature Engine → Evidence Store → Specialist Analysis → Cross-check → Recommendation → Validation → Report`

## B. Recommendation Contract
Every recommendation must have:
- id
- observation
- evidence references
- calculation/model version
- priority
- urgency
- expected impact
- dependencies
- proposed action
- owner/role
- success metric
- leading indicator
- failure criterion
- expiry/review date
- status

## C. Baseline & Drift Engine
Any measurable business object can have snapshots:
- KPI
- inventory velocity
- customer activity
- supplier exposure
- cash liquidity
- data quality
- forecast accuracy
- import quality

The engine compares current vs baseline, detects material change, explains likely drivers and creates alerts.

## D. Analysis Workspace
Persist the user's current investigation context so they can leave and return without losing filters, evidence, report outline, agent findings or recommendations.

## E. Explainability without chain-of-thought exposure
Expose reproducible calculations, source rows, metric definitions, model metadata, assumptions, confidence and evidence links. Do not expose hidden model chain-of-thought.

## F. File Intelligence
Before parsing any uploaded file:
1. fingerprint/hash
2. detect encoding
3. detect MIME/format
4. classify text/binary/generated/vendor
5. detect table/document/image
6. select parser
7. map columns/fields
8. report confidence and detection strategy
9. allow governed override

## G. Report Document Model
Reports are structured objects, not generated strings. Components include:
- cover/header
- executive summary
- KPI cards
- narrative sections
- tables
- charts
- evidence/citations
- calculation notes
- recommendations
- risks
- appendix
- metadata/version/signature

## H. Integration & job architecture
All long-running work uses a durable job lifecycle with:
- queued
- running
- progress
- paused/cancelled
- partial
- completed
- failed
- retry/resume
- audit log

## I. Security/operations
- permission-scoped workspaces
- provider credentials isolated from business data
- immutable audit trail
- rate/time/budget limits
- health/doctor diagnostics
- no arbitrary AI SQL
- no untrusted code execution
- human approval for high-impact actions

## Priority generated from these projects
P0:
- Evidence/Citation contract
- Recommendation contract
- File Intelligence/classification
- Report Document Model
- Baseline/Drift engine
- Analysis Workspace
- Research/agent orchestration

P1:
- Calculation inspector
- Falsifiability/success criteria
- Provider adapters
- Scheduled analysis
- Report renderer/export pipeline
- Localization/terminology registry

P2:
- Advanced accessibility/PDF archival
- Rich command palette/quick actions
- Expanded diagnostics and repository-style analysis tools
