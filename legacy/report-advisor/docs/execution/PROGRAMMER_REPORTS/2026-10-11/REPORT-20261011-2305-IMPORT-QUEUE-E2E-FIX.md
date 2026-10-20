# Execution report — 2026-10-11 23:05 +03 — Import E2E queue-flow alignment

## Identity
- Repository: Report-Engainall/Report-Advisor
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR #912: OPEN / NOT MERGED
- Base/main SHA: `fa1ab4cbade9b01685507aa966c10f700a03f576`
- Code/test head: [d0926e659f62fa42688ca4650f32d6f5792adbd4](https://github.com/Report-Engainall/Report-Advisor/commit/d0926e659f62fa42688ca4650f32d6f5792adbd4)
- Product complete: NO

## First actual failure and root cause
[Full Product Browser E2E run 38169565885](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169565885) tested `a70aa83c1a4698c741b3a76332f8a8b16cc3a663` and uploaded artifact [11714007138](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169565885/artifacts/11714007138). The screenshot `artifacts/e2e-business/failure.png` shows the import UI on upload step, with the fresh `${marker}.csv` file queued. The UI has intentionally moved from immediate parse-on-select to queue-then-explicit-analysis, via button `تحليل هذا المصدر`. The E2E helper had not clicked it. Worse, it waited for exact text `المراجعة`, which is always rendered as part of the stepper and cannot prove that parsing reached the review stage. It then called `isEnabled()` on a confirmation button that did not exist in the upload state, causing:
```
locator.isEnabled: Timeout 30000ms exceeded.
waiting for getByRole('button', { name: /تأكيد الاستيراد/ })
```

## Fix committed
Commit `d0926e659f62fa42688ca4650f32d6f5792adbd4` changes `scripts/real-business-e2e.mjs` only:
1. Select the specific queued source row by unique filename.
2. Click `تحليل هذا المصدر`.
3. Wait for the actual current-step marker `3. المراجعة — المرحلة الحالية`.
4. If review is not reached, capture URL, active stage, visible error messages and a bounded body excerpt in a useful `UNIFIED_IMPORT_REVIEW_NOT_REACHED` error.
5. Wait for the confirmation button to be visible before checking readiness.

No acceptance criterion has been relaxed. The new E2E still requires successful canonical import, generic-source semantic domain, row/tenant/provenance persistence, smart-report output on the same source hash and re-entry readback.

## Outstanding anonymous 401 responses
The previous artifact recorded two 401/42501 reads on `report_execution_jobs` using role anon and synthetic tenant-B company ID after the tenant-B logout path. This is not authorized access and was not opened up: no anon grants, no policy changes, and telemetry still fails on unhandled HTTP errors. These responses must be re-evaluated on the new run and fixed at the source/lifecycle if they persist.

## Previous gate passes (source-head scoped)
On `383c1e7cc8f120f71ba8f437bb6ea36d2326bba0`:
- Build PASS [38169658338](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169658338)
- Quality PASS [38169658373](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169658373)
- Phase-F PASS [38169658146](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169658146), 4/4 probes, RPO 101.61s, RTO 13.04s; artifact [11713377768](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169658146/artifacts/11713377768)
- Session Handoff PASS [38169658407](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169658407)
- Final Certification PASS [38169658436](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169658436)
- Device-Independent Browser PASS [38169658364](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169658364)
- Storage Tenant Runtime PASS [38169658339](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38169658339)
These passes are not transferred to the new code/test head d0926 until its own workflows are read back.

## Status
- IMPLEMENTED: yes.
- INTEGRATED: yes, in PR #912.
- PERSISTED/READBACK: source commit verified by GitHub.
- UI_EXPOSED: existing queued-source action confirmed in screenshot.
- BROWSER_PROVEN for d0926: pending.
- PRODUCTION_PROVEN: no.
- PRODUCT_COMPLETE: no.

## Next exact action
Read the new exact-head Full Product Browser result and required Build/Quality/Session Handoff/Phase-F/Certification checks. Continue from the first new runtime failure. Keep PR #912 open.
