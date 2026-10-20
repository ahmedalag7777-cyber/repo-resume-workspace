# Report-Advisor — Market & Trader Intelligence Specification

## Core Scope Rule
All intelligence in this specification is a **general rule for every SKU and every normalized item group**, not a special rule for the example product "أبو 20". The example is illustrative only.

For every item, the system continuously maintains historical memory, demand, customer relationships, stock, liquidity, risk, forecast and action signals. No SKU is excluded merely because it is currently slow, out of stock, new, seasonal or historically inactive.

## Objective
Transform Report-Advisor from a report reader into a continuously learning commercial advisor. The system must understand what the merchant sells, who buys it, when it moves, how much the business has demonstrably served, what liquidity it creates, what is becoming stagnant, what may happen next, and what action is justified by evidence.

## 1. Universal SKU Intelligence Record
For every SKU and normalized item group, maintain a continuously updated intelligence record containing:
- identity and aliases
- unit/base-unit conversions
- category/group/alternative relationships
- current stock and available stock
- historical stock states
- sales, purchases, returns and adjustments where available
- fulfilled and unfulfilled demand
- customer relationships
- supplier relationships
- price/cost/margin history
- demand baselines and forecasts
- seasonality
- velocity and acceleration
- stockout exposure
- liquidity contribution
- stagnation/slow-moving state
- anomaly state
- evidence quality/freshness
- current recommendation state.

Every SKU follows the same framework. The system must not require the merchant to nominate "important" products manually before analysis begins.

## 2. Observed Market Capacity
For every SKU and normalized item group, maintain observed merchant-market capacity, never claiming external total market size unless external data exists:
- units sold by day/week/month/year
- sales value and cost value
- gross margin and margin rate where cost exists
- unique customers buying the SKU
- active customers and customer retention
- average order quantity
- median order quantity
- minimum/maximum observed order
- order frequency
- days between purchases
- share of total sales, units, margin and liquidity
- share by customer segment, branch and channel where available
- peak periods and seasonal pattern
- recent acceleration/deceleration
- stock availability during the observed period
- lost-sales opportunities when demand was not fulfilled.

Do not call this the true market size unless external market data exists. Call it **observed addressable demand / observed merchant market capacity** based on the merchant's own history.

## 3. Demand Memory — Never Forget Historical Movement
Every SKU retains historical evidence even when current stock is zero or sales are temporarily low.

The following is only an example of the universal rule:
- July: 1,700 units sold
- August: stock = 0
- Current request: 350 units

The advisor must surface historical movement, current requests, expected near-term demand, days since replenishment, stockout duration, affected customers, estimated missed sales, replenishment range, confidence and evidence.

Historical peaks remain part of the baseline unless data-quality rules invalidate them. A previous high-volume period must not disappear merely because the current month is quiet.

## 4. Demand Potential vs. Actual Sales
Separate:
- actual fulfilled demand
- requested but unfulfilled demand
- estimated lost demand
- suppressed demand caused by stockouts
- seasonally expected demand
- exceptional/one-off demand.

Never use sales alone as demand when stockouts existed; this systematically underestimates the market.

## 5. Stockout-Aware Demand
For each SKU calculate where evidence allows:
- stockout dates/duration
- zero-stock periods
- partial availability
- orders rejected/partially fulfilled where evidence exists
- customer requests during stockout
- estimated lost units/value
- affected customers
- recurrence count
- opportunity cost
- next likely shortage date.

A high historical seller with low current stock must trigger a proactive warning before the next expected demand peak, not after complete unavailability.

## 6. Reorder Intelligence
For every SKU/group continuously recommend one of:
- reorder now
- prepare/order soon
- monitor closely
- maintain current purchasing
- reduce purchase
- do not reorder
- investigate data before decision.

Calculate where data supports it:
- target stock
- safety stock
- reorder point
- expected demand during lead time
- uncertainty buffer
- suggested quantity/range
- alternative SKU/group coverage
- cash required
- expected sales protected
- expected days of cover after reorder.

Recommendations account for supplier lead time, minimum order quantity, pack/unit conversion, available cash, supplier reliability and customer importance where those fields exist.

## 7. High / Low / Typical Sales — For Every SKU
Every SKU and group receives statistical movement baselines:
- maximum daily/weekly/monthly movement
- minimum non-zero movement
- average
- median
- percentile bands (P50/P75/P90/P95/P99 when sample size supports them)
- recent rolling average
- weighted recent average
- peak-to-current ratio
- volatility
- coefficient of variation where statistically valid.

Never base replenishment on a single maximum sale. The system should distinguish a genuine repeated peak from an exceptional transaction.

## 8. Demand Acceleration & Early Surge Detection — For Every SKU
Detect rising demand before a SKU becomes a shortage risk using:
- acceleration in units
- acceleration in order frequency
- number of unique buyers increasing
- average basket quantity increasing
- repeat-purchase interval shortening
- requests/waitlists if available
- cross-SKU/category leading indicators
- supplier lead time vs expected demand.

Classify every SKU as applicable: normal / emerging / accelerating / surge / anomalous.

Use graduated alerts with thresholds based on evidence volume and volatility. A tiny sample must not generate the same alarm as a persistent multi-period trend.

## 9. Stagnant / Slow-Moving Inventory — For Every SKU
Classify every SKU using:
- days since last sale
- units sold in rolling windows
- inventory age
- stock value locked
- margin contribution
- historical demand
- customer count
- trend
- seasonality.

Actions may include:
- monitor
- promotion candidate
- bundle with related item
- transfer to another branch
- reduce next purchase
- liquidate
- investigate data quality.

Never label an item stagnant solely because it is in a known seasonal trough.

## 10. Customer × SKU Intelligence — Complete Relationship Memory
For every SKU, maintain the customer population that interacts with it:
- customers who buy it
- last purchase date
- purchase frequency
- average quantity
- peak quantity
- usual reorder interval
- expected reorder window
- recent increase/decrease
- inactive customers
- customers affected by stockouts
- customers who requested unavailable stock.

For every customer, maintain the reciprocal view:
- SKUs purchased
- frequency and cadence
- dependence on specific SKUs
- lost/unfulfilled requests where available
- changes in basket composition.

The system should answer at any time:
- Who normally buys this item?
- Who stopped buying it?
- Who is due to reorder?
- Who was not served because of stock?
- Which customers depend heavily on this item?
- Which item shortages are likely to affect valuable customers?

Respect tenant isolation and customer privacy.

## 11. Customer Continuity / Churn Signals
For every active customer:
- normal buying cadence
- expected next purchase window
- deviation from cadence
- spend trend
- SKU coverage change
- high-value SKU abandonment
- inactivity duration.

Classify only as a signal: stable / at-risk / inactive / returning / expanding. Never present a statistical signal as certainty.

## 12. Merchant Dependence Map
For every SKU, group and category, calculate contribution and concentration:
- top by units
- top by revenue
- top by gross margin
- top by cash generation
- top by customer reach
- top customer-SKU relationships
- categories carrying the business
- suppliers carrying critical assortment.

Show concentration risk and dependence rather than hiding it inside aggregate totals.

## 13. Liquidity Intelligence — Every SKU Has a Cash Role
Classify every SKU/group where evidence supports it:
- cash generator
- fast cash converter
- high-margin but slow cash
- cash trap
- dead capital
- strategic traffic driver.

Calculate where data permits:
- inventory value
- cash tied up
- inventory turnover
- days inventory outstanding
- GMROI
- sell-through
- cash conversion contribution.

A product with modest revenue can still be strategically important because it generates fast cash or brings customers who buy other items.

## 14. Purchase Timing Intelligence
For every SKU continuously estimate when replenishment should be considered from:
- current/available stock
- demand forecast
- safety stock
- supplier lead time
- order cycle
- seasonal peak
- supplier reliability
- pending customer demand.

Alert before the reorder point is crossed, with enough lead-time margin to protect service levels.

## 15. Supplier Intelligence
For every supplier where data exists:
- lead time
- fill rate
- price history
- purchase frequency
- delays
- short shipments
- quality/rejection signals
- price changes
- dependency/concentration.

Identify supplier risk for every critical SKU rather than treating supplier analysis as a separate unrelated report.

## 16. Price & Margin Intelligence
For every SKU track:
- purchase cost changes
- selling price changes
- margin compression
- price elasticity signals when enough data exists
- customer-specific pricing behavior
- unusual discounts/returns.

Competitor/external price is used only when reliable external data is explicitly connected. Never infer competitor pricing from internal data.

## 17. Opportunity Detection
For every SKU/group identify where evidence supports:
- rising demand with insufficient stock
- frequent requests for absent products
- customers buying substitutes because the preferred SKU was unavailable
- cross-sell opportunities
- under-served customer segments
- strong margin + healthy velocity
- demand growing faster than inventory
- historically strong products whose availability has deteriorated.

## 18. Market Shock & Anomaly Detection
For every SKU detect unusual:
- sales spikes
- sales drops
- customer concentration shifts
- price changes
- return spikes
- stock adjustments
- negative stock
- impossible quantities
- unusual transactions.

Separate business anomalies from data anomalies.

## 19. Historical Comparison & Memory Windows
Every SKU supports comparisons such as:
- today vs yesterday
- this week vs previous week
- this month vs previous month
- current period vs same period last year when available
- rolling 7/30/90/180/365-day windows where sufficient history exists
- peak period vs current
- current stock vs historical demand.

Missing history must be shown explicitly rather than replaced with invented values.

## 20. Evidence & Confidence
Every recommendation must carry:
- evidence period
- transaction count
- source reports/files
- freshness
- data quality score
- model/algorithm version
- assumptions
- confidence
- reason for recommendation.

Low evidence = cautious recommendation, never confident automation.

## 21. Daily Commercial Brief
The home/dashboard should answer in under a minute:
1. What changed?
2. What is selling faster?
3. What is slowing down?
4. What may run out soon?
5. Which historically strong items are currently understocked?
6. What is tying up cash?
7. Which customers need attention?
8. What sales may have been lost?
9. What should be purchased?
10. What should not be purchased?
11. Which decisions are most urgent today?

## 22. Decision Queue
Create prioritized actions with:
- action
- impact
- urgency
- confidence
- expected value
- cash requirement
- evidence
- owner/status
- snooze/escalate/resolve.

## 23. Explainability / Drill-through
Every number and decision must support:
Dashboard → metric → calculation → normalized data → source rows → source report → source file → source snapshot.

## 24. Data Quality & Reconciliation Rules
Before intelligence:
- validate dates
- validate quantities
- validate units
- validate prices
- detect duplicates
- detect impossible values
- reconcile totals against source report totals when available
- detect missing periods
- detect schema drift
- preserve unmapped columns.

## 25. Multi-Scenario Planning
Support scenarios such as:
- demand +10/+20/+30%
- supplier delay
- price increase/decrease
- cash budget limit
- stockout of a key SKU
- alternative SKU substitution.

Show expected inventory, cash, sales protection and risk changes.

## 26. Governance Boundaries
- No fabricated market size.
- No fabricated customer demand.
- No fabricated competitor pricing.
- No automatic purchase execution without explicit authorization.
- No silent mapping of ambiguous ERP columns.
- No cross-tenant learning leakage.
- No deletion of source evidence.
- Every automated transformation must be deterministic/replayable.

## 27. Performance Strategy
- Parse once, cache normalized artifacts.
- Incremental row-level reconciliation.
- Partition historical data by tenant/time/report family.
- Background workers for heavy analysis.
- Bounded concurrency and backpressure.
- Progressive UI updates.
- Precompute daily aggregates.
- Keep detailed drill-down available without loading entire datasets.

## 28. UI/UX Direction
The visual system should feel like a premium commercial command center, not a spreadsheet dump:
- restrained gradients
- clear semantic status colors
- strong hierarchy
- compact KPI cards
- responsive mobile-first layout
- Arabic RTL-first quality
- accessible contrast
- skeleton/progressive loading
- command palette
- keyboard shortcuts on desktop
- saved views and filters
- drill-down drawers
- evidence panels
- daily digest
- decision queue.

Visual polish must never hide uncertainty or evidence.

## 29. Universal Application Rule
Every analytical capability added to Report-Advisor must operate across **all eligible SKUs and normalized item groups**, with the same evidence standards. Examples in requirements, demos, tests or UI copy are illustrative test cases only.

The system must not hard-code special treatment for a named product, customer or category unless an explicit merchant configuration defines a business rule.

## 30. Success Criterion
Report-Advisor should eventually answer, for every eligible SKU and group from the merchant's continuously ingested data:

> What sells, to whom, when, how fast, how much the business has actually served, what demand may be hidden by stockouts, what is likely to happen next, what cash is tied up, what opportunity is being lost, which customers are affected, and what should the merchant do today — with evidence.
