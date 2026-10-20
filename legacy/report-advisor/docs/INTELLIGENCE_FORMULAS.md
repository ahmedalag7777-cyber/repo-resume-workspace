# Intelligence Formula Contract

## Inventory velocity
`avg_daily_sales = sum(daily_sales) / number_of_observed_days`

`days_of_cover = current_stock / avg_daily_sales`

If average daily sales is zero, coverage is infinite and positive stock is classified as frozen inventory rather than pretending a finite turnover rate exists.

## Safety stock
`SafetyStock = Z × σ_daily × √LeadTime`

Default `Z = 1.65` (approximately 95% one-sided service target). This is a configurable policy, not a universal truth.

## Reorder point
`ReorderPoint = AvgDailySales × LeadTime + SafetyStock`

## Maximum stock
`MaxStock = AvgDailySales × (LeadTime + ReviewPeriod + SafetyDays) + SafetyStock`

## Recommended order
`RecommendedOrder = max(0, MaxStock - CurrentStock)`

The production implementation rounds quantities upward because purchasing fractional units is not generally valid for packaged wholesale goods; a future unit-of-measure layer may override this behavior.

## Stockout date
`StockoutDate = Today + floor(CurrentStock / AvgDailySales)`

The date is a forecast, not a guarantee. It must be displayed with the underlying average and confidence/evidence.

## Cashflow
For each day:

`ClosingCash = OpeningCash + Inflows - Outflows`

`LiquidityGap = max(0, MinimumReserve - ClosingCash)`

The crisis engine prioritizes collections when a gap exists and recommends deferral of lower-priority outflows rather than fabricating a source of cash.

## Forecast baseline
Weighted moving average:

`Forecast = Σ(weight_i × recent_demand_i) / Σ(weights)`

Uncertainty band baseline:

`Margin = Z × σ × √horizon`

This is intentionally deterministic and explainable. Advanced forecasting models must outperform the baseline on a held-out validation window before being promoted.

## Governance
Every displayed recommendation should retain:
- metric name
- input period
- source
- calculation version
- confidence/uncertainty
- generated timestamp

No AI model is allowed to silently replace these deterministic calculations.
