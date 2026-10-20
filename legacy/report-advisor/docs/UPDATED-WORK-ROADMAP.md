# مساعد التاجر — Updated Work Roadmap

## Product North Star
Report-Advisor is a continuous commercial intelligence and decision platform for merchants. It must transform trusted operational/accounting data into an evidence-backed understanding of demand, customers, inventory, liquidity, risk and next actions — not merely display reports.

## Universal SKU Rule
Every intelligence capability is a **general rule for every eligible SKU and normalized item group**. Named products in examples are illustrative only and must never receive hard-coded analytical treatment. No SKU is excluded because it is new, slow-moving, seasonal, out of stock or historically inactive.

## New — Commercial Equivalence Groups (CEG)
The system now treats merchant-defined equivalence/coverage groups as a first-class business concept, separate from ERP product identity and separate from ordinary categories.

### Purpose
Multiple distinct SKUs can be sold under different brand/company names, packaging or source identities while serving the same commercial demand. The merchant can explicitly declare that selected SKUs **collectively cover one demand need** and should be analyzed together for stock coverage, demand, shortage risk, replenishment and market capacity.

Example only: several different 20-liter oil SKUs may be members of one merchant-defined demand group, while another 20-liter SKU remains deliberately independent even though it shares the same broad category/size.

The same mechanism applies universally to all product families, sizes, pack formats, brands, qualities and commercial substitutes (e.g. 1.5L, 750ml, 400g and any other merchant-defined family). Examples are not hard-coded.

### Critical Separation of Identities
Maintain three distinct layers:
1. **Product/SKU identity** — the exact ERP item remains independent for stock, cost, price, supplier, margin and traceability.
2. **Category/family identity** — broad classification such as size, type or product family; never automatically treated as a substitute group.
3. **Commercial Equivalence Group** — an explicit merchant-approved set of SKUs that can jointly satisfy the same demand for specified purposes.

Never merge SKU master records physically just because they belong to a CEG. Aggregation is a derived analytical view with full drill-down to each original SKU.

### Merchant Control Table
Provide a dedicated management table/page where the merchant can:
- create a group with a meaningful business name
- choose a canonical/base unit
- add/remove member SKUs
- set each member as `primary`, `alternative`, `supporting` or `excluded`
- set an effective-from/effective-to period
- define whether the group applies to inventory coverage, demand aggregation, replenishment, customer substitution, reporting, or only selected scopes
- set priority/ranking among members
- define whether substitution is full, conditional or prohibited
- define conversion factors into the group's base unit
- define minimum/maximum acceptable pack/unit constraints
- record a reason/note for the grouping
- approve/review the group
- deactivate without deleting historical evidence.

### Grouping Is Not Automatic by Name
The engine may suggest candidate groups using normalized name, unit, size, brand/type attributes and observed customer substitution behavior, but **the merchant remains the authority for final grouping** unless an explicit trusted rule authorizes automation.

Never combine products solely because they share a word such as "20 لتر". Different brands/qualities may be commercially non-equivalent. Ambiguous suggestions must enter review.

### Substitution Modes
Each group/member relationship supports:
- `full_substitute` — one unit can normally satisfy one unit of the group's demand.
- `conditional_substitute` — usable only under defined merchant conditions.
- `partial_substitute` — conversion/coverage is less than one-to-one.
- `not_substitute` — member remains in family/category but cannot cover another member's demand.

Do not assume substitutability from category membership.

### Group Demand Aggregation
For each CEG calculate, where the configured relationship permits:
- total units sold across members normalized to base unit
- revenue and cost
- weighted/aggregated margin
- unique customers
- customer demand cadence
- fulfilled demand
- unfulfilled demand
- estimated lost demand
- stockout periods by member and group
- group velocity
- group high/low/typical movement
- group seasonality
- group acceleration/deceleration
- group demand forecast.

Always retain member-level metrics beside group metrics.

### Group Inventory Pool / Coverage
For each CEG, calculate **effective group inventory** as the sum of eligible member inventory converted to the group's base unit, subject to member availability, unit conversion, status and substitution rules.

Example only:
- SKU A: 80 units
- SKU B: 60 units
- SKU C: 25 units
- SKU D: 0
- all are approved full substitutes
- group effective inventory = 165 base units.

If one member is independent/excluded, its stock must **not** enter the group pool. If a member has conditional substitution, only the permitted coverage amount enters the relevant scenario.

### Coverage Is Not Just a Sum
The group engine must also calculate:
- group days of cover
- member-specific days of cover
- expected demand during supplier lead time
- safety stock
- group reorder point
- shortage date
- service-level risk
- concentration risk (too much stock in one member)
- unusable/conditional stock
- stock trapped in slow members while another member is selling quickly.

This prevents the false conclusion that "the group has enough stock" when the available stock is not actually substitutable or operationally usable.

### Cross-SKU Demand Transfer
When one group member is unavailable and another member's sales rise, detect possible substitution only when evidence supports it.

Track:
- preferred SKU
- replacement SKU
- customer acceptance
- units transferred
- revenue/margin impact
- substitution frequency
- stockout trigger
- confidence.

Do not automatically attribute all increased sales of SKU B to shortage of SKU A without evidence.

### Customer × Group Intelligence
For every CEG maintain:
- customers who buy any member
- customers who buy multiple members
- preferred member per customer
- customers accepting substitutes
- customers rejecting substitutes where evidence exists
- customer-level demand in group base units
- expected reorder window
- unmet group demand
- customers at risk from group shortage.

This enables the advisor to say that the group may be adequately stocked overall while a specific customer's preferred SKU is unavailable.

### Group-Level Lost Sales
Estimate lost demand at two levels:
- exact SKU lost demand
- group-level demand that could have been satisfied by an approved alternative.

Never double-count lost sales: demand satisfied by another group member must not also be counted as lost demand.

### Group Replenishment
Replenishment decisions must operate at both levels:
- SKU reorder
- group reorder allocation.

If group demand is high but one member is overstocked and another is understocked, recommend allocation/consumption of existing approved stock before unnecessary purchase.

Suggested purchase quantity must account for:
- group forecast
- current eligible group stock
- member stock
- safety stock
- supplier lead time
- MOQ/pack constraints
- cost and cash budget
- preferred member ranking
- substitution constraints
- customer preference
- supplier reliability.

### Group Pricing & Margin
Never merge prices/costs simply because SKUs are grouped. Preserve member economics and calculate group-level weighted metrics separately.

The system should identify:
- cheapest available coverage
- highest-margin member
- fastest-moving member
- cash-efficient member
- strategic preferred member.

Recommendations must never violate merchant pricing rules or customer-specific pricing permissions.

### Group Lifecycle & Audit
Groups are versioned and effective-dated. Changes must record:
- who changed the group
- when
- old/new membership
- old/new conversion
- reason
- affected reports/metrics
- recalculation status.

Historical reports must remain reproducible under the grouping configuration that was effective at the time, while current views may use the current configuration.

### Group Conflict Detection
Detect and prevent dangerous configurations:
- same SKU assigned to incompatible active groups in the same scope
- circular/recursive groups
- invalid conversion factors
- incompatible units
- duplicate membership rules
- contradictory substitution rules
- group spanning unrelated tenant data
- effective-date overlaps with conflicting definitions.

Allow intentional multi-group membership only when scopes/relationships make the business meaning unambiguous and the system can prevent double counting.

### Group Suggestions & Learning
The system may propose:
> "These 7 SKUs appear to serve the same demand pattern. Review as a possible commercial group."

Evidence can include:
- normalized attributes
- shared customer demand
- substitution after stockouts
- similar unit/pack
- correlated movement
- merchant history.

The proposal is not active until approved when merchant approval is required. Approved mappings may become tenant-scoped reusable knowledge.

### Group Intelligence Must Feed All Major Engines
Commercial Equivalence Groups must integrate with:
- demand velocity
- forecast
- stockout/lost-sales
- inventory intelligence
- customer continuity
- supplier intelligence
- liquidity analysis
- stagnation detection
- surge detection
- replenishment
- decision dashboard
- daily advisor
- what-if scenarios
- alerts
- reporting/export.

No parallel calculation path should create inconsistent group totals.

## New — Continuous Governed Folder Report Ingestion
- Preserve manual single-file import unchanged.
- Preserve user-selected folder batch import.
- Add continuous watched-folder ingestion through the Local Sync Agent after explicit folder authorization.
- Detect new/changed files automatically; debounce and wait for file stability before reading.
- Support recursive folders with bounded depth, exclusions, retry, pause/resume, quarantine and audit history.
- Use SHA-256, source fingerprints and idempotency ledger.
- Process files independently; one failure never blocks the batch.
- Use bounded concurrency/backpressure and resumable background queues.
- Persist lifecycle: discovered → stable → scanning → classified → mapped → validated → committed/quarantined/failed.
- Browser-only deployments use explicit File System Access API; arbitrary typed paths never grant filesystem access.
- UNC/network folders require Local Sync Agent with least-privilege access.
- Quality gates: folder import, watcher stability, idempotency and security.

## New — Continuous Incremental Report Intelligence
- Treat the folder as a living source, not a one-time upload.
- First ingestion builds historical baseline and evidence state for every eligible SKU/group.
- Later ingestion classifies files as unchanged, appended, revised, replaced or new.
- Process only genuinely new/changed rows when source semantics support safe incremental processing.
- Use source primary key → document/line identity → stable business key → deterministic row fingerprint hierarchy.
- If historical rows can be reordered/deleted/revised, automatically switch to bounded reconciliation or full reprocessing.
- Never equate changed timestamp with changed business records.
- Maintain source versions, hashes, row counts, cursors, row fingerprints and snapshots.
- Maintain source → report profile → mapping → canonical row → metric → decision lineage.
- Recalculate all affected intelligence after valid changes.
- Produce daily change digest: new/revised/reversed records, KPI changes, new/resolved risks and recommended actions.
- Background processing is resumable and deterministic; correctness outranks superficial speed.

## New — Data Change Intelligence & Lineage
- First-class Change Set: file change → row change → semantic change → affected metric → affected decision.
- Classify new, modified, deleted/missing, reversed, duplicate, unchanged, schema_changed and unresolved.
- Immutable source snapshots plus compact delta ledger.
- Deterministic replay using snapshot + parser/profile version.
- Data Quality Score for file/report/dataset with explicit reasons.
- Schema drift detection and safe quarantine.
- Source conflict resolution: append/replace/duplicate/conflict based on evidence.
- Full drill-through for important numbers and recommendations.

## New — Universal ERP / Accounting Report Recognition
- Versioned Report Schema Registry for Arabic/English accounting exports.
- Onyx Pro is first-class target; extend to Al-Mutakamil, Raqish and other systems using evidence-backed profiles.
- Recognize from report title, sheet names, headers, column order, types, values, formulas, merged cells and profile fingerprints.
- Normalize Arabic/English headers, Arabic/Latin digits, punctuation, whitespace, abbreviations, diacritics, dates, currencies and units.
- Canonical coverage: documents, customers, suppliers, products, inventory, financial/ledger, taxes, dates/periods and report metadata.
- Report families: sales, purchases, returns, inventory, item movement, customer/supplier statements, receivables/payables, cash, bank, journals, general ledger, trial balance, P&L, balance sheet, tax and operational reports.
- Preserve original/unmapped fields.
- Confidence scoring and ambiguity quarantine; no silent guessing.
- Tenant-approved aliases are versioned and scoped to matching profile fingerprints.
- Manual mapping remains the fallback; approved mappings become reusable profiles.
- Exact vendor headers are never invented; real exports/templates are authoritative.

## New — Market Demand & Commercial Intelligence
Detailed specification: `docs/MARKET_DEMAND_INTELLIGENCE_SPEC.md`.
- Every SKU and every Commercial Equivalence Group receives the same universal intelligence framework.
- Historical demand memory, fulfilled/unfulfilled demand, stockout-aware demand, high/low/typical movement, early surge, stagnation, customer × SKU, customer continuity, merchant dependence, liquidity, replenishment, supplier, price/margin, opportunity, anomaly and seasonality intelligence operate at both SKU and approved group level.
- Group metrics are normalized to configured base units and never erase member-level evidence.

## New — Decision Intelligence
- Velocity → forecast → coverage → stockout → alternatives → lost sales → evidence → replenishment.
- Decision arbitration uses impact, urgency, confidence, liquidity, customer impact and freshness.
- Actions: do_not_reorder, monitor, reorder_sku, reorder_group, investigate, follow_up_customer, review_supplier, review_price.
- Every decision includes evidence period, transactions, sources, data quality, assumptions, algorithm/profile version and confidence.
- No automated purchase execution without explicit authorization.

## New — Daily Trader Advisor
Dashboard must answer in under one minute:
1. What changed?
2. What is accelerating?
3. What is slowing/stagnating?
4. What may run out?
5. Which historically strong items are understocked?
6. What cash is trapped?
7. Which customers need attention?
8. What sales may have been lost?
9. What should be bought?
10. What should not be bought?
11. What are today's highest-impact decisions?
12. Which commercial groups have enough total coverage but a dangerous member-level shortage?
13. Which group has fragmented stock across several small balances that should be evaluated as one demand pool?

Use an action queue with opened → acknowledged → actioned → resolved → reopened lifecycle and suppress repeated alerts until state changes or escalation thresholds are crossed.

## New — Multi-Scenario Planning
Support deterministic what-if scenarios for demand changes, supplier delay, price changes, cash budget limits, key SKU stockouts and substitute availability. Show expected stock, cash, sales protection and risk changes.

## New — Evidence, Governance & Trust
- No fabricated market size, customer demand, competitor pricing or historical facts.
- No silent ERP mapping.
- No source deletion.
- No cross-tenant learning leakage.
- No purchase execution without authorization.
- Every transformation replayable and auditable.
- Low evidence produces cautious output.
- Group membership is merchant-controlled unless an explicitly trusted automated rule is configured.
- Group calculations must be explainable down to member SKU and source row.

## New — Premium Product UX
- Mobile-first Arabic RTL with desktop command center.
- Executive cockpit, decision queue and daily digest.
- Dedicated Commercial Equivalence Groups management screen with search, filters, membership editing, effective dates, substitution mode, base unit, conversion, status and evidence.
- Group detail view: total coverage + member stock + demand + customers + risk + liquidity + substitutions.
- Side-by-side member vs group analytics.
- Command palette and keyboard shortcuts.
- Saved views, filters and grouping.
- Drill-down drawers from KPI → group → member SKU → evidence → source rows → report → file.
- Progressive loading and responsive background processing.
- Restrained gradients, accessible contrast, semantic status colors and consistent design tokens.
- Visual polish must never obscure confidence or evidence.

## Performance Architecture
- Parse once and cache normalized artifacts.
- Incremental row reconciliation.
- Precomputed daily aggregates for SKU and group.
- Background workers/agent queues.
- Bounded concurrency/backpressure.
- Partition history by tenant/time/report family.
- Progressive UI updates.
- Detailed evidence available without loading whole datasets.

## Quality & Production Gates
- Folder import, watcher stability, idempotency and security.
- Incremental reconciliation and fallback-to-full-reprocess.
- Lineage/change-digest contract.
- Data-quality score.
- Schema drift/conflict resolution.
- Deterministic replay.
- Schema registry and vendor-profile regression fixtures.
- Mapping-confidence/no-hallucination.
- Universal SKU coverage tests: every analytical engine must work across all eligible SKUs/groups, not just fixtures/examples.
- Commercial Equivalence Group schema/security/tenant-isolation contract.
- Group membership conflict/cycle/effective-date validation.
- Unit conversion correctness and normalized base-unit arithmetic.
- Group aggregation and member drill-down consistency.
- No double-counting across overlapping scopes.
- Substitution attribution and lost-sales correctness.
- SKU/customer relationship correctness.
- Historical peak/current and rolling-window correctness.
- Surge/stagnation classification tests.
- Replenishment/liquidity decision determinism.
- Cross-tenant authorization.
- Large dataset performance/memory/pagination.
- Integration/load/security production hardening.
- Release only after all mandatory gates pass.

## Active / Completed Implementation Units
Existing completed units remain authoritative; new specifications must reuse existing canonical engines rather than create parallel calculation paths.
- `src/lib/free-toolbox/inventory-dynamics.ts`
- `src/lib/free-toolbox/stockout-loss.ts`
- `src/lib/free-toolbox/customer-item-demand.ts`
- `src/lib/free-toolbox/liquidity-drivers.ts`
- `src/lib/free-toolbox/alternative-groups.ts`
- `src/lib/free-toolbox/alternative-group-report.ts`
- `src/lib/free-toolbox/alternative-group-governance.ts`
- `src/lib/free-toolbox/inventory-intelligence-pipeline.ts`
- `src/lib/free-toolbox/substitution-recommendation.ts`
- `src/lib/free-toolbox/replenishment-decision.ts`
- `src/lib/free-toolbox/decision-evidence.ts`
- `src/lib/free-toolbox/forecast-signal.ts`
- `src/lib/free-toolbox/alternative-group-ui-model.ts`
- `src/lib/free-toolbox/grouped-report.ts`
- `src/lib/free-toolbox/alternative-group-security.ts`
- `src/lib/free-toolbox/decision-dashboard.ts`
- `src/lib/free-toolbox/sales-demand-series.ts`
- `src/lib/import/batch-folder.ts`
- `src/components/FolderBatchImportPanel.tsx`
- `src/pages/ImportPage.tsx`
- `src/pages/AlternativeGroupsPage.tsx`
- `src/pages/InventoryIntelligencePage.tsx`
- `src/pages/DemandVelocityPage.tsx`
- `docs/REPORT_FORMATS_YEMEN_ARAB_ERP.md`
- `docs/MARKET_DEMAND_INTELLIGENCE_SPEC.md`

## Next Execution Sequence
1. Connect real time-series demand to grouped demand and days-of-cover for every eligible SKU/group.
2. Implement Commercial Equivalence Group persistent model, governance, UI and normalized aggregation.
3. Implement group stock coverage, shortage and substitution-aware lost-sales calculations.
4. Implement SKU × customer and Group × customer demand memory.
5. Implement high/low/typical movement, rolling baselines and percentile bands at SKU and group levels.
6. Implement early demand surge and stagnation detection across all SKUs/groups.
7. Implement liquidity classification and merchant dependence map across all SKUs/groups.
8. Implement forecast-aware replenishment and purchase timing across all SKUs/groups.
9. Build Report Schema Registry and Onyx Pro regression fixtures.
10. Add Local Sync Agent continuous watcher.
11. Add incremental reconciliation ledger and immutable snapshots.
12. Add lineage graph, Data Quality Score and Schema Drift.
13. Build Daily Trader Advisor + Decision Queue + Change Digest UI with group-aware alerts.
14. Integrate What-if/Scenario Engine with commercial decisions.
15. Add universal-SKU/group golden datasets, cross-tenant, load and deterministic replay tests.
16. Polish mobile RTL/desktop UX with the unified design system.
17. Run full CI and production hardening; fix every failure before release.
