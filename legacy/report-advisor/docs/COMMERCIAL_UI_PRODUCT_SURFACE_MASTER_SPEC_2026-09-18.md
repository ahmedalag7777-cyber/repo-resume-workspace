# Report-Advisor — Commercial UI & Product Surface Master Specification
## Permanent product direction — 2026-09-18

### Purpose
This document is the permanent UI/product direction for making Report-Advisor commercially legible, differentiated, and useful to real businesses. It complements `docs/MASTER_EXECUTION_INDEX.md`; it does not replace runtime, security, evidence, or certification contracts.

### Product principle
The interface must sell the outcome, not the database.

The first screen should answer:
1. What is happening to my business?
2. What needs my attention now?
3. Why does the system believe that?
4. What should I do next?
5. What happened after I acted?

The visual truth chain remains:
**Source → Evidence → Data → Insight → Decision → Action → Outcome**

Never hide missing, stale, review, rejected, or insufficient-data states.

---

## 1. Primary commercial navigation

### Tier 1 — always visible
- Command Center
- Import & Analyze
- Data Quality
- Reports
- Intelligence
- Work Center

### Tier 2 — high-value business modules
- Sales
- Purchases
- Receivables
- Profitability
- Inventory
- Demand
- Customers
- Products
- Decisions / Recommendations

### Tier 3 — specialist/advanced modules
- RFM
- ABC
- Aging Analysis
- Alternative Groups
- Metric Inspector
- Scenarios
- Document Intelligence
- File Analysis
- Audit / Evidence
- Integrations
- Proposal Demo

### Tier 4 — administration
- Company
- Team / Roles
- Settings
- Billing / Plan / Usage
- Security
- System / Operations

Tier 3 should be progressively disclosed rather than competing visually with daily business work.

---

## 2. Command Center — the money screen

The home screen must be the strongest commercial surface.

### Executive headline
Use a compact period-aware headline:
- Sales / revenue
- Gross margin / profitability when valid
- Receivables outstanding
- Cash position when valid
- Inventory exposure
- Active business alerts
- Data coverage/freshness

### Immediate action strip
Prioritize actionable cards such as:
- overdue receivables requiring collection
- low-stock / stockout risk
- declining sales
- margin compression
- unusual transaction movement
- data quality blockers
- imports awaiting review
- documents requiring human review

Each card must expose:
**impact → reason → evidence → recommended action → destination**

### Business pulse
A visually dominant trend area with:
- current period
- previous comparable period
- trend direction
- coverage/freshness
- drill-down

### Decision queue
A dedicated section:
- urgent
- today
- monitor
- resolved

Do not show decorative recommendations. Every recommendation must have a source/evidence boundary and a destination.

### Customer and product opportunities
Compact ranked surfaces:
- customers with receivable/retention opportunity
- products driving revenue/margin
- products at risk
- alternative-product opportunities
- demand acceleration/decline

---

## 3. Progressive disclosure / configurable workspace

The application must support three levels without creating separate products:

### Essential
For normal business users:
Command Center, Import, Reports, Receivables, Inventory, Sales, Customers, Products, Decisions.

### Advanced
For analysts/managers:
Profitability, Demand, RFM, ABC, Aging, Alternatives, Metric Inspector, Scenarios, Data Quality.

### Expert
For operations/data teams:
Document Intelligence, File Analysis, Evidence/Audit, Integrations, System/Operations.

### Admin controls
The user/company admin can:
- show/hide navigation modules
- pin favorites
- choose default landing page
- reorder permitted navigation groups
- choose Essential/Advanced/Expert density
- enable/disable optional widgets
- control which dashboard cards are visible
- save role-specific workspace presets

Hidden means visually hidden, not security-bypassed. Authorization remains server-side and tenant-scoped.

---

## 4. Role-based workspace presets

Prepare the UI for presets without inventing new backend authorization paths.

Suggested presets:
- Owner / Executive
- Finance
- Sales
- Collections
- Inventory
- Operations
- Analyst
- Data / Import Operator

Each preset should emphasize the relevant work and reduce noise. The same canonical data and permissions remain authoritative.

---

## 5. High-value business pages

### Receivables
Must feel like a collection workbench, not a report:
- total outstanding
- overdue amount
- aging bands
- top accounts
- collection priority
- customer detail
- invoice/evidence context where available
- next action
- export/report action

### Profitability
- revenue
- cost
- gross profit
- margin
- product/customer/channel dimensions where canonical data supports them
- currency validity
- coverage
- drill-down to evidence

### Inventory
- stock position
- stockout risk
- overstock/exposure
- movement velocity
- slow movers
- replenishment attention
- demand context
- product alternatives

Do not invent “critical” status when the canonical model cannot support it.

### Demand
- velocity
- trend
- seasonality where actually available
- forecast/scenario context
- confidence/evidence
- recommended operational response

### Customers
Customer 360 should combine only canonical/available information:
- identity
- sales
- outstanding receivables
- purchase trend
- RFM where available
- last activity
- risk/opportunity
- evidence links

### Products
Product 360:
- sales
- margin
- inventory
- demand
- ABC/RFM/alternative-group context
- movement
- attention flags
- evidence

---

## 6. Reports as a product, not a PDF button

Reports must provide:
- Executive Report
- Sales Report
- Purchase Report
- Inventory Report
- Receivables Report
- Profitability Report
- Decision/Recommendation Report
- Data Quality Report
- Evidence/Audit Report

Every report surface should expose:
**period + tenant + currency + as-of + freshness + source/evidence boundary**

Actions:
- view
- filter
- compare
- drill down
- print
- PDF/export where supported
- return to source/decision

---

## 7. Import & Document Intelligence

Import must communicate the complete journey:

**Upload → Fingerprint → Extract → Normalize → Validate → Analyze → Decide → Commit → Render**

The UI should make each stage observable.

For documents:
- extraction confidence
- validation status
- review required
- rejection reason
- normalized fields
- source document
- evidence
- canonical result

Arabic OCR policy remains:
- <50 reject
- 50–74 review
- >=75 trusted

Confidence must never be cosmetically upgraded by the UI.

---

## 8. Data Quality as a revenue-protection surface

Do not bury data quality in Settings.

Command Center should surface only the defects that affect decisions. Data Quality should provide:
- issue severity
- affected metric/report
- affected records
- root cause
- recommended resolution
- status
- evidence
- impact

A customer should understand why a KPI is unavailable instead of seeing an unexplained blank or fabricated zero.

---

## 9. Intelligence / assistant

The assistant belongs inside Intelligence and must behave as a business analyst interface.

High-value prompts/actions:
- Explain this KPI
- Why did sales change?
- What is hurting margin?
- Who owes us money?
- Which products need attention?
- What changed since last period?
- Show evidence
- Explain missing data
- Open the relevant report
- Open the relevant customer/product/decision

The assistant must use canonical evidence and deterministic metric math. It must not manufacture numbers, sources, confidence, or actions.

---

## 10. Decision Experience

Make the product's distinctive value visible:

**Observation → Evidence → Recommendation → Decision → Action → Outcome**

Each decision card should show:
- problem
- quantified impact when valid
- evidence
- confidence/state
- proposed action
- accept/reject/defer where the existing authorized path supports it
- resulting outcome when persisted

This is the key differentiation from ordinary dashboards.

---

## 11. Evidence-first visual language

Use a consistent visual vocabulary:
- Confirmed/calculated
- Insufficient data
- Review required
- Rejected
- Stale
- Processing
- Failed
- No evidence

Never use green simply because a component rendered. Status color must represent data/runtime state.

Every important KPI should have an inspectable provenance affordance:
**metric → formula/definition → period → tenant → as-of → freshness → evidence**

---

## 12. Commercial conversion surfaces

The product should communicate value without becoming a marketing site.

### First-session value
After onboarding/import:
- “Your business snapshot”
- immediate detected opportunities/issues
- data coverage
- first useful report
- recommended next step

### Proposal Demo Mode
Preserve the planned Upwork/Proposal Demo Mode:
- scenario-specific presentation
- client/company context
- selected screenshots/views
- requirement-to-feature mapping
- capability snapshot
- no contamination of production tenant data
- no fabricated runtime evidence

### Billing / plan surface
Use the existing provider-neutral billing runtime. UI should expose:
- current plan
- capabilities
- usage
- limits
- upgrade path
- billing events/status where available

Do not claim payment-provider completion until real provider integration/runtime proof exists.

---

## 13. Differentiators to keep visible

The interface should make these capabilities obvious:
1. Evidence-first BI
2. Document-to-decision pipeline
3. Arabic/English document intelligence
4. Tenant isolation
5. Data-quality-aware KPIs
6. Decision workflow
7. Inventory + demand intelligence
8. Receivables/collections intelligence
9. Customer/product 360
10. Executive reporting
11. Low-bandwidth PWA/mobile usability
12. Auditability and provenance
13. Configurable workspace
14. Proposal Demo Mode
15. Provider-neutral billing/entitlements

---

## 14. UX rules that save money and improve retention

- Do not make users navigate five pages to understand one problem.
- Put the next useful action next to the insight.
- Prefer drill-down over duplicated dashboards.
- Preserve filters and context when moving between pages.
- Use saved views for recurring work.
- Use compact tables for operational tasks and rich cards for decisions.
- Lazy-load specialist modules.
- Do not ship large decorative assets.
- Avoid duplicate chart libraries/components.
- Keep mobile actions reachable.
- Keep low-bandwidth paths useful even when advanced visualizations are deferred.

---

## 15. Admin personalization controls

The Settings UI should include a visual workspace editor:
- module visibility
- dashboard widget visibility
- role preset
- default landing page
- density
- favorite routes
- navigation order
- reset to product defaults

Provide safe defaults so a new customer sees the high-value path immediately.

---

## 16. Future-ready capability slots

Reserve visual architecture for future commercial additions without implementing fake functionality:
- scheduled reports
- alerts/notifications
- integrations
- API/connectors
- white-label/branding
- multi-company consolidation
- benchmark views
- custom metrics
- workflow automation
- approval policies
- advanced forecasting
- anomaly detection
- subscription/usage analytics

These must appear only when implemented/entitled; otherwise they remain hidden or clearly marked as unavailable.

---

## 17. Anti-patterns — permanently prohibited

- dashboard full of cards with no action
- generic “AI” chat disconnected from evidence
- fake live numbers
- fake confidence
- hidden data-quality failures
- unexplained zeros
- giant navigation containing every specialist feature
- exposing technical implementation details to normal users
- duplicate data paths
- client-side authority for commits
- UI-driven certification claims
- synthetic business evidence
- adding backend/RPC/runner solely to make a UI look complete

---

## 18. Definition of commercial UI completion

UI/Product is not complete when pages exist.

A commercial surface is complete only when:
- the user understands its purpose within seconds;
- the primary action is obvious;
- important data has visible provenance/state;
- empty/loading/error/review/insufficient states are deliberate;
- desktop/tablet/mobile are usable;
- Arabic RTL is coherent;
- navigation and deep links preserve context;
- the page uses canonical existing data paths;
- no fake data/evidence is introduced;
- performance/resource cost is controlled;
- visual QA has been run on the exact source SHA.

### Permanent priority
**Money first:** revenue, margin, cash/receivables, inventory, demand, customers/products, decisions, reports.

**Trust second:** evidence, freshness, data quality, auditability, tenant/security states.

**Advanced intelligence third:** RFM, ABC, scenarios, document intelligence, specialist analytics.

**Administration fourth:** settings, integrations, billing, operations.

The interface should make the first two layers impossible to miss while allowing administrators to hide or reveal advanced layers.
