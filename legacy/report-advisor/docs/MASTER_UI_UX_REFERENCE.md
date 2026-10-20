# MASTER UI/UX REFERENCE — الأغبري / Report-Advisor
Status: CANONICAL DOMAIN REFERENCE
Owner: Product surface completeness

## 1. Purpose
This file owns the complete customer-facing surface model. It defines what a complete screen means, how the product is navigated, which states must exist, and how UI work is prioritized. It does not authorize new backend routes merely to satisfy the visual map.

## 2. Product shell
Every authenticated experience inherits one shared shell:
- Arabic RTL workspace
- company / period / As Of / freshness / trust context
- right-side primary navigation
- Command Palette
- persistent Aghbari Advisor drawer
- notifications/account
- responsive/mobile/PWA behavior
- shared typography, spacing, surfaces and controls

No page may ship as a visually isolated mini-product.

## 3. Canonical information architecture
### 01 مركز القرار / Decision Center
- Business pulse
- Decision queue
- Signals & exceptions
- Opportunities / Money Recovery
- Decision Coverage
- Decision ROI
- Business Replay
- Outcome follow-up

### 02 البيانات والتشغيل / Data Operations
- Work Center
- Unified Import / Upload
- Document Intelligence
- Extraction / OCR
- Validation / Review
- Reconciliation / Deduplication
- Data Quality
- Sources / Connectors
- Watched Reports / Folder Processing
- Operational Jobs

### 03 التحليل التجاري / Business Analytics
- Analytics home
- Sales
- Purchases
- Profitability
- Receivables / Collections
- Liquidity / Cash
- Inventory
- Demand / Movement
- Customer / Supplier analysis
- RFM / ABC / XYZ / FSN
- Aging
- concentration / anomalies / trends

### 04 الذكاء والقرار / Intelligence & Decision
- Signals
- drivers / early warnings
- recommendations
- forecasts and backtests where gates pass
- scenarios
- AI advisory
- Decision Experience
- Decision Playbooks

### 05 الثقة والأدلة / Trust & Evidence
- Evidence Center
- Evidence Passport
- provenance / lineage
- Metric Inspector
- snapshots
- confidence / quality
- decision evidence
- benchmark governance / trust health

### 06 التقارير والمخرجات / Reports & Outputs
- Executive report
- domain reports
- Report Builder
- review
- export / print

### 07 البيانات المرجعية / Master Data
- Customers
- Products
- Suppliers
- Warehouses
- inventory entities
- business keys / synonyms / units / packaging
- semantic dictionary

### 08 الإعدادات / Settings
- Company
- users / roles / permissions
- profile
- language / currency
- sources / connectors
- notifications
- security
- integrations
- system health

## 4. Screen completeness contract
Every canonical surface must contain:
1. meaningful title/context
2. primary business question
3. real data source
4. evidence/trust state where relevant
5. loading state
6. empty state
7. error state
8. review/blocked/insufficient-data state where relevant
9. primary next action
10. secondary discovery actions
11. responsive layout
12. accessible focus/keyboard behavior
13. canonical route
14. no fake metrics
15. coherent interaction with the shell
16. real links into evidence/detail workflows

A page is not complete because the default populated state looks good.

## 5. Import UX contract
One user-facing ingestion entry:
Any Source -> Read -> Understand -> Structure & Meaning -> Quality -> Evidence -> Review -> Canonical Approval/Commit -> Business Understanding

UI must not ask the customer to choose a target table/entity before source understanding.

Visible lifecycle:
queued -> fingerprinted -> extracted -> canonicalized -> validated -> analyzed -> decisioned -> committed -> rendered

Committed must never be visually claimed before authoritative DB commit succeeds.

## 6. Truth-state design
Use explicit states:
VERIFIED, TRUSTED, PARTIAL, REVIEW, BLOCKED, INSUFFICIENT DATA

Never hide uncertainty through friendly copy.

## 7. Product-value UI rules
Prefer UI that:
- shortens a decision path
- exposes why a result exists
- shows evidence next to important claims
- gives a concrete next action
- reveals opportunity/risk
- reduces steps
- improves trust
- works under low bandwidth

Do not add visual elements merely to make screens look fuller.

## 8. Visual constitution
Aghbari:
- dark ink foundation
- teal/emerald primary analytical language
- restrained warm-gold emphasis
- high information density with whitespace hierarchy
- progressive disclosure
- semantic color only
- Arabic-first typography
- no copied vendor UI
- no generic template sections
- no duplicated navigation trees

## 9. 50% UI execution objective
UI lane must drive each canonical route toward:
Route -> Surface -> Components -> Data Binding -> States -> Actions -> Evidence -> Responsive -> Accessibility -> Regression

A polished shell without real state/data/action coverage is incomplete.

## 10. Completion audit
At each UI wave, audit:
- route completeness
- sidebar/navigation parity
- component reuse
- visual consistency
- state completeness
- real data wiring
- actionability
- evidence disclosure
- responsive behavior
- accessibility
- performance
- no duplicate import or evidence path

## 11. Absorbed visual-system and interaction rules

### Business-first hierarchy
Every screen should answer:
1. what is happening?
2. what needs attention?
3. why?
4. what should I do?
5. what happened after the action?

Priority:
Today / Money / Exceptions / Decision -> Truth / Evidence -> Advanced Analysis -> Administration

### Interaction density and responsive rules
- enterprise density without clutter
- business body text around 12–14px where the established system uses it
- table text around 11–13px where density requires it
- mobile input text >=16px to avoid platform zoom problems
- mobile touch targets >=44px
- restrained 8–14px radius system
- 1px borders where useful; shadows mainly for floating layers

These are design-system defaults, not excuses to violate accessibility.

### Navigation
Use:
Today -> Command/Search -> contextual navigation -> favorites/recents where supported.

Advanced capabilities should be progressively disclosed instead of promoted into top-level taxonomy.

### Overlay semantics
- Toast for quick-result feedback
- inline alert for content-local problems
- modal for confirmation/critical tasks
- drawer/sheet for contextual work without losing page state
- tooltip for concise help

Do not use a modal where a drawer preserves context better.

### Reports and printing
Every report surface exposes company, period, currency, As Of/freshness and evidence state.
A4 is the default print target where relevant; print output removes application chrome and avoids visual fragmentation.
Summary versus itemized presentation must be explicit for financial/operational reports.

### Accessibility
- keyboard access throughout
- visible focus
- icon buttons have accessible names
- native semantics before ARIA
- correctly ordered headings
- do not trap or obscure focus with sticky overlays
- semantic status meaning must not rely on color alone

### UI quality gate
Hierarchy -> Density -> Evidence -> Action -> Accessibility -> Mobile -> Print -> Empty/Loading/Error

A surface is complete only when the quality gate is satisfied, not merely when the populated screenshot looks polished.
