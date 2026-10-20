# Dashboard Tenant B runtime evidence — 2026-09-08

## Scope

Authenticated runtime observation for Tenant B (`RUNTIME-EVIDENCE-B-401117`) against the current production deployment lineage.

## Observed truth

- Customers: 1
- Products: 1
- Sales invoices: 1
- Inventory: 0 items / 0 value
- Sales invoice currency: YER
- Company currency: SAR
- Therefore financial metrics that require currency consistency must remain `INSUFFICIENT_DATA`; the application must not manufacture SAR totals from a YER invoice.

## Defect identified

The dashboard received an aggregate snapshot status of `INSUFFICIENT_DATA` because financial metrics were currency-incompatible, then incorrectly reused that aggregate status for unrelated metrics.

This caused known values such as `invoiceCount = 1` and `inventoryValue = 0` to display the `بيانات غير كافية` badge even though the underlying values were known and valid.

## Fix

`DashboardPage.tsx` now derives each KPI display status from that KPI's own canonical value:

- finite numeric value, including `0` → `CONFIRMED`
- `null` → `INSUFFICIENT_DATA`

No backend financial truth is weakened. Currency mismatch remains insufficient data.

## Regression protection

`check-dashboard-null-truth.mjs` now verifies both the canonical nullable KPI contract and the per-metric dashboard status mapping. The workflow path filter includes `DashboardPage.tsx` so the guard executes when this behavior changes.

## Integrity

- Base SHA: `d0ddda19a21a341bc77931d14c2358545c6fd328`
- Fix branch: `fix/dashboard-metric-status-truth-current-main`
- No production alias mutation.
- No database data mutation.
- No historical migration rewrite.
