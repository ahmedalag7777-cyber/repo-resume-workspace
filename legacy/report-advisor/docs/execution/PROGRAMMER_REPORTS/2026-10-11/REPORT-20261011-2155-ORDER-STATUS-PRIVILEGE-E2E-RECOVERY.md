# Report — 2026-10-11 21:55 +03 — Restore authenticated order-status read and rerun browser proof

Repository: `Report-Engainall/Report-Advisor`  
Branch: `fix/source-bound-generic-intelligence-20261009`  
PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED.  
Baseline head before this recovery: `2a128ab3621a426a26e855c4ce66c1dfe09724dc`.  
Product status: **PRODUCT_COMPLETE = NO**.

## First demonstrated failure

The completed [Full Product Browser E2E run 38164694687](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38164694687) failed on exact SHA `d9884cb458d19da402a6b7f4d40ef3e8a9129794`, job `114544711814`. The authenticated Chromium route proof passed (step 17), and the smart-report passport selector advanced beyond the previous nonexistent-English-heading failure.

The first new failure was the real customer/order flow. The browser requested `public.order_status_history` as role `authenticated` and received HTTP 403 / SQLSTATE `42501`: `permission denied for table order_status_history`. The browser could not observe the expected persisted confirmation, `تم حفظ انتقال الطلب وإعادة قراءة الحالة من المصدر.`, and correctly failed closed.

Evidence artifact: [full-product-browser-proof-38164694687](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38164694687/artifacts/11711995869).

## Root cause — verified against live staging

Staging project `fnqbvfuwbdpwvhcgzksl` had:
- `authenticated SELECT = false` for `public.order_status_history`;
- `anon SELECT = false`;
- row-level security enabled;
- existing `order_status_history_staff_read` SELECT policy restricted to current tenant plus active eligible membership.

The repository's older schema-parity migration already expressed the intended authenticated SELECT grant, but the live ACL did not contain that grant. This is live migration/schema drift, not a missing browser label and not a reason to weaken the E2E assertion.

## Applied and read-back-verified correction

Applied staging migration version `20261011185449`, name `restore_authenticated_order_status_history_select`, containing only:

```sql
GRANT SELECT ON TABLE public.order_status_history TO authenticated;
```

Post-migration database readback verified:
- `authenticated SELECT = true`;
- `anon SELECT = false`;
- `RLS enabled = true`;
- `order_status_history_staff_read` policy present = true.

No insert/update/delete privileges were added. The tenant policy was not changed or bypassed. The migration is being recorded in the repository at `supabase/migrations/20261011185449_restore_authenticated_order_status_history_select.sql`.

## Other current-head gate evidence

- [Session Handoff Contract run 38164695511](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38164695511): PASS on `2a128ab3621a426a26e855c4ce66c1dfe09724dc`.
- [Final Certification Gate run 38164695553](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38164695553): PASS on `2a128ab3621a426a26e855c4ce66c1dfe09724dc`.
- [Phase-F live resilience run 38164694601](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38164694601): PASS on tested ancestor `d9884cb458d19da402a6b7f4d40ef3e8a9129794`.
- Data Quality Runtime [run 38164694533](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38164694533): PASS on `d9884cb458d19da402a6b7f4d40ef3e8a9129794`.
- Quality [run 38164694658](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38164694658) FAILED on `d9884cb...` in a concurrent-branch-head setup race: the early exact-head guard rejected the moving ref, dependency installation did not run, and later commands reported missing `eslint` / `vite`. This does not constitute a source quality PASS or a proven source defect; rerun quality with a stable head.

Supabase security advisors also returned separate pre-existing warnings (46 authenticated-callable SECURITY DEFINER functions and leaked-password protection disabled); this narrow grant correction does not remediate those broader items.

## Remaining proof boundary

The database grant and ACL/RLS readback are proven. The Full Product Browser run above is still a **FAIL** for its earlier execution, and must not be retroactively relabeled. The next CI run must consume the new migration and rerun the full browser journey on the exact latest PR head. It must prove the order status-history query now works and then continue the report source/job/hash identity, refresh/re-entry, decision, and work checks.

NEXT EXACT ACTION: Advance the handoff report baseline to the new migration commit in a docs-only checkpoint, then inspect the newly triggered Full Product Browser E2E, Quality, Session Handoff, Final Certification and Phase-F results on that same latest head. Fix only the first newly demonstrated runtime failure. Keep PR #912 open; do not claim PRODUCT_COMPLETE.
