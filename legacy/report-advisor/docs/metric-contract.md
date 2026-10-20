# Metric Contract

All executive metrics are deterministic and source-traceable.

## Revenue
Sum of `sale_items.line_total` for non-cancelled/non-void sales invoices in the requested date range.

## Cost of Sales
Sum of `sale_items.quantity * sale_items.cost_price` for the same sales scope.

## Gross Profit
Revenue - Cost of Sales.

## Gross Margin %
Gross Profit / Revenue * 100. Zero when Revenue is zero.

## Receivables
Sum of positive `(sales_invoices.total - paid_amount)` for non-cancelled/non-void invoices up to the reporting end date.

## Payables
Sum of positive `(purchase_invoices.total - paid_amount)` for non-cancelled/non-void invoices up to the reporting end date.

## Inventory Value
Sum of `inventory_balances.quantity * unit_cost` for the company.

## Reorder Count
Inventory balance rows whose quantity is less than or equal to the product reorder point.

## Out of Stock
Inventory balance rows whose quantity is less than or equal to zero.

## AI grounding rule
AI explanations and recommendations may reference these metrics, but may not create alternative numerical values. If a metric is unavailable, the answer must explicitly state that it is unavailable.

## Scope rule
Every metric query must include a company scope. Date filters are explicit and must not be inferred silently by the explanation layer.
