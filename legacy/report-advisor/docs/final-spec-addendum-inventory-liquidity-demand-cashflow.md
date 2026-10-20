# Final Specification Addendum — Inventory Liquidity, Demand, Cash Flow & Liabilities

This addendum is mandatory and is part of the final comprehensive Report-Advisor specification.

## 1. Inventory Liquidity & Velocity

### 1.1 Inventory liquidity classification
Every inventory report must classify stock into:
- **Moving / immediately saleable inventory**: stock with sufficient recent demand and positive expected sell-through.
- **Frozen / stagnant inventory**: stock with no or insufficient movement according to configurable aging/velocity thresholds.

The classification must show quantity, inventory value, last movement/sale date, days since last sale, velocity and estimated days-to-clear.

### 1.2 Item cycle
For each item calculate average sell-through duration using available historical movement/sales data. The report must provide an automated action-plan area for slow-moving goods, such as prioritizing promotion, bundling, price review, transfer between warehouses/branches, supplier return where applicable, or controlled liquidation. Recommendations must be grounded in actual metrics.

### 1.3 Sales performance
Provide ranked classifications for highest-selling and lowest-selling items, with sales averages for:
- daily
- weekly
- half-monthly
- monthly
- half-yearly
- yearly

All periods must use consistent definitions and support drill-down to source sales rows.

## 2. Demand Forecasting & Reorder Engine

### 2.1 Supply barriers
For every eligible item calculate or recommend:
- minimum stock
- maximum stock
- reorder point

Calculations must expose the assumptions used (lead time, safety stock, observed demand/velocity and data window).

### 2.2 Recommended demand / purchase quantity
Produce required purchase quantities for:
- 1 day
- 1 week
- 15 days
- 1 month

For each item calculate a projected **Stockout Date** from current available quantity and demand rate. If the result is not statistically reliable, mark confidence/data sufficiency instead of fabricating precision.

### 2.3 Proactive forecast
Forecast next-week demand using actual item sales/movement history and behavioral patterns. Support model metadata, training window, forecast horizon, confidence and error metrics where sufficient history exists.

### 2.4 Priority summaries
The decision cockpit must answer, in ranked actionable form:
- What should I order?
- When should I reorder?
- What should I sell/promote?
- What should I buy first?

Each answer must include reason, expected impact, urgency, affected items and source metrics.

## 3. Cash Flow, Parties & Liabilities

### 3.1 Partner ranking
Provide movement/activity rankings for:
- customers
- suppliers
- exchangers / banks / cash accounts when the source data supports them

Support highest-to-lowest and lowest-to-highest views.

### 3.2 Due-date schedule
Provide a financial timeline for receivables, payables and other obligations across:
- daily
- weekly
- half-monthly
- monthly
- half-yearly
- yearly

Show due amount, overdue amount, counterparty, due date, priority and expected cash impact.

### 3.3 Inactive customers
Detect customers with declining or absent activity using configurable inactivity windows. Provide follow-up recommendations grounded in last purchase date, historical value, frequency and outstanding balance.

### 3.4 Liquidity crisis management engine
Create a deterministic cash-allocation and prioritization engine that compares expected cash inflows with upcoming obligations. It must be able to identify situations such as daily sales/collections being insufficient for clustered supplier obligations and produce a programmable priority plan:
- whom to collect from today
- which customer receivables to prioritize
- which supplier to pay and when
- which bank/exchanger/cash account to use when data supports it
- how much liquidity to allocate
- how to schedule supplier payments to reduce liquidity risk
- which obligations must not be delayed

The engine must explicitly show assumptions, available cash, expected inflows, required outflows, timing gaps, reserve policy and resulting risk. It must never invent balances, accounts or obligations.

## 4. Integration requirements

These capabilities must not become isolated reports. They must feed the executive dashboard, alerts, recommendations, forecasts and decision cockpit. Every recommendation must retain source metric references and calculation metadata.

## 5. Acceptance criteria

A feature is complete only when its data model/query exists, its report/UI exists, it has drill-down/source traceability, permissions are enforced, empty/insufficient data is handled honestly, and automated or reproducible acceptance verification exists.
