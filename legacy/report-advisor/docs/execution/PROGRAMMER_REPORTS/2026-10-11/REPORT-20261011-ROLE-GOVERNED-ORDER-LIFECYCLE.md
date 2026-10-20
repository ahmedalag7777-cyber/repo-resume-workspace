# Report — 2026-10-11 — role-governed operational workflow

Repository: `Report-Engainall/Report-Advisor`  
Branch: `fix/source-bound-generic-intelligence-20261009`  
PR [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912): OPEN / NOT MERGED.  
Code/test baseline to validate: `e4f01c4cf7bb19b44cfd9b76b3f3e8286a21fdee`.  
PRODUCT_COMPLETE = **NO**.

## First proven failure on the previous tested head

[Full Product Browser E2E run 38166724841](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724841) ran against `3d6fa46f159540ff5c510c87b062baf70a1996b2`. It passed the authenticated route proof and the source-bound smart-report checks. It then:
- successfully persisted the sales actor's `pending → confirmed` order transition;
- failed when the same `sales` actor attempted `confirmed → preparing`;
- received HTTP 403 / SQLSTATE 42501 with `order transition not allowed`;
- produced no invoice because the order lifecycle correctly stopped at `confirmed`.

Artifact: [full-product-browser-proof-38166724841](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724841/artifacts/11711923595).

Read-only staging DB evidence for order `77000000-0000-4000-8000-000000000002` shows the successful `pending → confirmed` row with actor role `sales`. The actual `public.transition_order(uuid,text)` SECURITY DEFINER function enforces this matrix:
- pending → confirmed/cancelled: owner, admin, sales;
- confirmed → preparing/cancelled: owner, admin, warehouse;
- preparing → ready/cancelled: owner, admin, warehouse;
- ready → completed: owner, admin, warehouse, sales.

This is intentional least-privilege enforcement. No new database grant or relaxed RPC policy is appropriate.

## Root cause

There are two product/test issues, not a general RLS outage:
1. `OperationsPage` generated the next-status action from order status only, so a sales actor saw an action that the canonical RPC correctly denied.
2. The full-business E2E used one sales actor for the entire lifecycle and did not hand off warehouse stages to an eligible operator.

The earlier post-mutation feedback defect is also already fixed: the persisted success message is preserved across `load({ preserveFeedback: true })`, preventing the UI from erasing its own confirmation.

## Actual code changes committed; exact-head validation pending

- Commit [`bc53828428900c7594a67b8cd4761bc73bb1f3fc`](https://github.com/Report-Engainall/Report-Advisor/commit/bc53828428900c7594a67b8cd4761bc73bb1f3fc):
  - `OperationsPage` resolves active tenant role and gates the next-status button against the transition permissions;
  - users without permission see an Arabic explanation rather than an actionable forbidden transition;
  - the E2E uses the existing tenant-A admin/approver identity after the sales-confirmed state, verifies same tenant and actual membership role, then reads back status between every transition;
  - the transactional-spine contract checks the UI permission matrix and actor handoff assertions.
- Commit [`e4f01c4cf7bb19b44cfd9b76b3f3e8286a21fdee`](https://github.com/Report-Engainall/Report-Advisor/commit/e4f01c4cf7bb19b44cfd9b76b3f3e8286a21fdee) adds an explicit assertion that the sales actor sees no confirmed→preparing action and does see the restriction note.

These code commits were intentionally marked `[skip ci]` to advance the handoff baseline in a docs-only checkpoint before running the full workflow. They have **not** been certified by CI yet.

## Previous code-head gates

On exact head `3d6fa46f159540ff5c510c87b062baf70a1996b2`:
- Product Build Gate [38166724846](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724846): PASS.
- Quality [38166724725](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724725): PASS.
- Session Handoff [38166724780](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724780): PASS.
- Data Quality Runtime [38166724815](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724815): PASS.
- Final Certification [38166724830](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724830): PASS.
- Phase-F Live Resilience [38166724794](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724794): PASS.
- Full Product Browser [38166724841](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38166724841): **FAIL**, correctly rejecting the unauthorized second transition.

These PASS results apply to `3d6fa46...`, not to the code commits above.

## Next exact action

Run the complete exact-head gates after this docs-only baseline commit. First inspect the `test:transactional-spine` result, then the Chromium business proof:
- prove the sales user can confirm a pending order;
- prove that same sales user cannot see a confirmed→preparing button;
- prove the restriction explanation is visible;
- perform remaining warehouse lifecycle steps with the verified tenant-A admin actor;
- prove invoice/payment persistence and audit readback;
- continue source-bound report, decision, approval, work and refresh/re-entry proofs.

Fix only the first new logged failure. Keep PR #912 open. Do not claim PRODUCT_COMPLETE.
