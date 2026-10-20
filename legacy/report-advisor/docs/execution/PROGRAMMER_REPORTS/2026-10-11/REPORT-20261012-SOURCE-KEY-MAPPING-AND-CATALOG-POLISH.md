# Execution Report — 2026-10-12 — source-key resolution and smart-report catalog polish

## Identity
- Repository: Report-Engainall/Report-Advisor
- Branch: fix/source-bound-generic-intelligence-20261009
- PR #912: OPEN / NOT MERGED — https://github.com/Report-Engainall/Report-Advisor/pull/912
- Code head: 4d682ed013ff5804d744b6ebe72ccd99a002918a
- Commit: https://github.com/Report-Engainall/Report-Advisor/commit/4d682ed013ff5804d744b6ebe72ccd99a002918a
- Product completion: NO.

## Data-backed root cause
The source-analysis metadata for a real 610-row invoice PDF mapped the date column to canonical invoice_date, while persisted canonical_dataset_records.data rows hold the actual key date (not invoice_date). The evaluator previously returned the mapped field without checking the stored row keys; dateValue therefore skipped the real source values, which explains a missing trend finding/model signal/recommendation even though required source fields were available. The actual source also contains the Arabic net amount header 'مبلغ الصافي بالمحلي', now an explicit canonical alias for netAmount.

## Implementation
- src/lib/report-intelligence/archetype-evaluator.ts: field selection resolves to keys present in canonical row data; mapped metadata cannot synthesize absent row keys.
- src/lib/report-intelligence/canonical-schema.ts: recognizes the real Arabic net-amount header.
- scripts/report-intelligence-value-chain.test.ts: regression uses date -> invoice_date metadata against a persisted date key, checks finding/signal/recommendation and evidence.
- src/pages/ReportsPage.tsx: added accessible Arabic search, supported/review filters, local nine-card paging, count and empty state, and source SHA fingerprint on each report card rather than an unproven “period unavailable” field.
- scripts/customer-facing-report-surface-contract.test.mjs: asserts the new customer catalog interactions are present.
- Source corpus and 48/48 threshold unchanged.

## Exact-head workflow snapshot at code head
- Build: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38188029987 — IN_PROGRESS.
- Quality: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38188030024 — IN_PROGRESS.
- Browser E2E: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38188030067 — PENDING.
- Session Handoff: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38188030212 — QUEUED.
- Phase-F Live Resilience: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38188030131 — QUEUED.
- Final Certification: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38188030059 — IN_PROGRESS.
- Data Quality Runtime: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38188030107 — IN_PROGRESS.
- Older E2E on code head 717b8f... had reached the source matrix after a successful authenticated business journey but did not yet return a result/artifact at last read. It is not proof for this head.
- Historical parent matrix (head 26334116...) reported 21/48. That remains historical, not transferred to the new head.

## Still unproven
- Exact-head TypeScript regression and UI build/tests pass.
- Real-source matrix coverage after source-key fix reaches 48/48 without fabrication.
- New full authenticated Chromium flow + fresh CSV/XLSX readback.
- Phase-F and certification on approved source head.
- Production deployment from an approved head and live readback of the same source identity.

## Next action
Verify state/memory/current report/archive readback and handoff. Then inspect build/quality and the new browser job and artifact; act on the first source-matrix failure. Do not merge, promote, or label PRODUCT_COMPLETE.

