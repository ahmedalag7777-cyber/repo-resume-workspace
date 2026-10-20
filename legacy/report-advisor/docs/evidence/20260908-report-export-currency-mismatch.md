# Report export currency mismatch — 2026-09-08

## Observed runtime evidence

Authenticated Tenant A report export was exercised from the Sales Report page.

The browser issued `POST /rest/v1/rpc/get_sales_export_rows` and Supabase returned HTTP 400 with PostgreSQL error `P0001` and message `FINANCIAL_CURRENCY_MISMATCH`.

The browser also surfaced the same rejection as an unhandled promise, which made the export button appear to do nothing.

## Data truth

Tenant A company currency is SAR while its active sales invoices are recorded in YER. Tenant B shows the same class of mismatch. This is intentional certification/E2E data and must not be silently converted, deleted, or rewritten merely to make export pass.

The canonical export RPC is therefore correctly fail-closed. The defect is the user-facing error lifecycle, not the financial guard.

## Fixes

1. Preserve the browser download lifecycle by attaching the anchor to the document and revoking the object URL asynchronously after dispatch.
2. Surface known guarded export failures (`FINANCIAL_CURRENCY_MISMATCH`, tenant resolution failures, and unavailable report data) as a visible Arabic alert instead of an unhandled rejection.
3. Do not bypass or weaken the canonical currency guard.
4. No database mutation, Production alias mutation, or historical migration rewrite was performed.

## Boundary

This evidence is source-level and browser-observation evidence for the export failure. It does not certify a successful export for mixed-currency data. A successful export requires financially coherent source data under the existing fail-closed contract.
