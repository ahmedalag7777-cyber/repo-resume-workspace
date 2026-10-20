# Execution Report — 2026-10-11 — Cart-item logical restore root-cause fix

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED.
- Exact code/test head: [`eaebe8ccaaacf17846ceb070c33229cd7d1e3b48`](https://github.com/Report-Engainall/Report-Advisor/commit/eaebe8ccaaacf17846ceb070c33229cd7d1e3b48).
- Main base: `fa1ab4cbade9b01685507aa966c10f700a03f576`.
- Product complete: **NO**.

## Actual code changes

1. The exact-head Phase-F live restore on `eb94db1f3bad9d59020d7beb8ea42c8309f53ee1` failed with `cart_items_cart_id_fkey`: `public.carts` rows were excluded from the public-only logical dump, but child `public.cart_items` rows were still restored and referenced missing carts.
2. Updated `scripts/phase-f-live-resilience-probes.mjs` so the operational-only exclusion set contains both `public.carts` and `public.cart_items`. These rows are cart/session state, not report/decision truth; canonical report rows and evidence remain eligible for restoration.
3. Added test assertions in `scripts/resilience-runtime.test.mjs` and `scripts/check-phase10-backup-restore-contract.mjs` to prevent either table from silently re-entering the dump.
4. Reconciled this checkpoint against the actual current PR head rather than the stale `844cfdc` checkpoint. The intervening E2E/report contract modifications in `scripts/real-business-e2e.mjs` and `scripts/smart-report-complete-intelligence-surface.test.mjs` are included in this handoff record.

## Exact evidence

On preceding code/test head `eb94db1f3bad9d59020d7beb8ea42c8309f53ee1`:
- Product Build Gate: [38155177440](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177440) PASS.
- Quality: [38155177434](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177434) PASS.
- Data-quality runtime: [38155177534](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177534) PASS.
- Storage Tenant Runtime E2E: [38155177507](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177507) PASS.
- Device-Independent Browser E2E: [38155177482](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177482) PASS.
- Report Value Cohort: [38155177355](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177355) PASS.
- Session Handoff failed because the report did not name two intervening files: [run 38155177461](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177461).
- Final Certification failed at the same stale-handoff guard: [run 38155177475](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177475).
- Phase-F live resilience failed 3/4; the remaining backup/restore verification failed on `cart_items_cart_id_fkey`: [run 38155177490](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155177490).

On new code/test head `eaebe8ccaaacf17846ceb070c33229cd7d1e3b48`, the new Build Gate, Quality, Phase-F, Session Handoff, Full Product Browser E2E, Device-Independent Browser E2E and Final Certification runs were queued/pending at checkpoint time. They are NOT PASS until terminal results are read. Netlify/Vercel status was pending. No production claim is made.

## Remaining and next action

- Prove the new `cart_items` exclusion using the exact-head live restore.
- Clear handoff/certification after this checkpoint is read back.
- Complete authenticated upload → visible general + eligible specialist findings → source evidence → save/readback → route navigation → refresh/re-entry, requiring stable `reportJobId + sourceHash`.
- Keep 48 archetype real-source coverage and production-current proof NOT PROVEN until exact artifacts establish them.

**NEXT EXACT ACTION:** Consume the new exact-head Full Product Browser E2E and Phase-F restore runs; fix the first real failure only, then repeat the source-bound browser journey on the resulting exact head.
