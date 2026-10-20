# Report — 2026-10-11 22:08 +03 — Operations success feedback erased during readback

Repository: `Report-Engainall/Report-Advisor`  
Branch: `fix/source-bound-generic-intelligence-20261009`  
PR [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912): **OPEN / NOT MERGED**.  
Code fix commit: `ca5b98d592b090dd2b315e5fe3fe6c589edfb39a`.  
Product complete: **NO**.

## Latest exact-head browser failure

[Full Product Browser E2E run 38165973454](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973454) failed on exact head `e0fbc12728869b6005d30c66c1f4f1e8a92baf74`. Authenticated Chromium route proof passed. The smart-report source-bound readback also passed: report job `8dbafdf8-f769-4c4f-97a5-22eac8b47d41`, source path `تقارير ارصدة المخزون.pdf`, hash `sha256:3e945a181e766f2e2a50ea765a2db40d57a5c6049481b8e208be10a59d328839`, 254 rows, quality score 98.

The business step stopped waiting for the exact status message `تم حفظ انتقال الطلب وإعادة قراءة الحالة من المصدر.`; the workflow artifact [11712690989](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973454/artifacts/11712690989) contains the browser screenshot and structured `result.json`. The browser result's first failure was the success-message locator timeout; it did not report the previous `order_status_history` 403/42501.

## Root cause demonstrated by code and DB readback

In `src/pages/OperationsPage.tsx`, `runOrderTransition` set a success message and immediately called `load()`; `load()` then unconditionally called `setFeedback(null)` before fetching the updated data. This erased the confirmation during the post-mutation reload even when the transition RPC succeeded.

Read-only staging DB evidence after run 38165973454:
- Order `77000000-0000-4000-8000-000000000002`, company `f68a7e91-3c7e-46fb-97a8-e339bec04e13`, idempotency key `E2E-ORDER-B-001`, updated at `2026-10-11 19:03:43.854439+00`.
- Latest history row at that exact timestamp records `pending → confirmed` for the same order/company.
- Therefore, the DB transition persisted; the visible confirmation was cleared before the UI assertion could observe it. This is a UI state-lifecycle defect, not a repeated ACL denial.

## Code fix committed (needs exact-head rerun)

Commit [`ca5b98d592b090dd2b315e5fe3fe6c589edfb39a`](https://github.com/Report-Engainall/Report-Advisor/commit/ca5b98d592b090dd2b315e5fe3fe6c589edfb39a) changes:
1. `load(options?: { preserveFeedback?: boolean })` clears stale feedback for ordinary/manual refreshes, but supports preserving a fresh mutation confirmation.
2. Order transition, invoice creation, and payment recording call `load({ preserveFeedback: true })` so their success messages survive the follow-up data refresh.
3. `scripts/transactional-spine-contract.test.mjs` asserts the explicit preserve option and all three mutation refresh paths, protecting against recurrence.

Commit is marked `[skip ci]` only to let the next docs-only baseline checkpoint prepare a clean handoff; it does not claim validation. The current report/state/memory baseline is being advanced to this exact code commit, after which the workflows must run on the new docs-only head.

## Existing gate results (exactly for pre-fix head e0fbc127…)

- Build/Product Build Gate [38165973507](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973507): PASS.
- Quality [38165973528](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973528): PASS.
- Session Handoff [38165973334](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973334): PASS.
- Data Quality Runtime [38165973290](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973290): PASS.
- Final Certification [38165973565](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973565): PASS.
- Phase-F Live Resilience [38165973481](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973481): PASS.
- Full Product Browser E2E [38165973454](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38165973454): **FAIL**, step 18; not browser proof of the ACL fix or the UI confirmation repair.

All these gate outcomes are tied to `e0fbc...`, not `ca5b98d592b090dd2b315e5fe3fe6c589edfb39a`.

## Next exact action

Advance `REPORT_FOR_HEAD` to `ca5b98d592b090dd2b315e5fe3fe6c589edfb39a` in a docs-only checkpoint and re-read state/report from GitHub. Inspect the newly triggered exact-head test runs, especially `test:transactional-spine` and the full authenticated business journey. Require evidence that the success confirmation remains visible after data reload, that the updated order and history are re-read, and that the invoice/payment/source-bound smart-report checks continue. Keep PR #912 open; do not declare PRODUCT_COMPLETE.
