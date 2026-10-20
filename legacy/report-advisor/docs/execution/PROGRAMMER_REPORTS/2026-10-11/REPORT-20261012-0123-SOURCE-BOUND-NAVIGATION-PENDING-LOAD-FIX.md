# Execution Report — 2026-10-12 01:23 +03
## Report-Advisor / Source-bound report navigation during detail load

### Exact state
- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR #912: open, not merged
- Code/test head covered by this checkpoint: `158b84c52112d3125d5080bd8cda4df6533fb0a9`
- Preceding documentation checkpoint: `0188d75a979b19a6671947827d84fcea91ed398d`
- Main base: `fa1ab4cbade9b01685507aa966c10f700a03f576`
- Product status: `PRODUCT_COMPLETE = NO`; do not merge.

### Actual changes committed
1. `src/components/ReportSourceContext.tsx` — new context-aware shortcut links are available while a valid report identity/hash is waiting for its detail read. Link destinations preserve the exact `reportJobId` plus encoded `sourceHash`. A null fetch result is converted to a visible error, not a forever-pending context.
2. `scripts/customer-facing-report-surface-contract.test.mjs` — new source-context navigation assertions.
3. `scripts/real-business-e2e.mjs` — waits for the source-bound intelligence link before checking all seven required cross-screen links and their lineage.
- UI commit: https://github.com/Report-Engainall/Report-Advisor/commit/3f95fa168d4afbf57ceb072e2926a64aaae91ba0
- Contract commit: https://github.com/Report-Engainall/Report-Advisor/commit/95baf6b4fdb5d7df48a62f85bfd53aa498312830
- Browser assertion commit / code-test head: https://github.com/Report-Engainall/Report-Advisor/commit/158b84c52112d3125d5080bd8cda4df6533fb0a9

### First evidenced failure and root cause
- Failed run: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38179172579
- Failed browser job: `114589036744`
- Exact failure: `REPORT_CONTEXT_LINK_MISSING:/intelligence`
- Artifact: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38179172579/artifacts/11717034355
- The exact result shows the report was tenant-authenticated and persisted/read back before the link assertion: reportJobId `8dbafdf8-f769-4c4f-97a5-22eac8b47d41`, source `تقارير ارصدة المخزون.pdf`, SHA-256 `sha256:3e945a181e766f2e2a50ea765a2db40d57a5c6049481b8e208be10a59d328839`, 254 canonical rows, quality score 98, trust `TRUSTED`, evidence state `AWAITING_EVIDENCE_SNAPSHOT`.
- Root cause: `ReportSourceContext` only rendered cross-screen shortcuts after its independent asynchronous report-detail request completed. The reports center's own content finished first, so the E2E reached the shortcut assertion while that component was still waiting. The pending/error state also provided no context-preserving links.
- The fix does not change RLS, tenant checks, report identity validation, or evidence status.

### What is and is not proven
- Proven: the three commits exist on PR #912 and the changed source and test files were read back from GitHub on the exact code-test head.
- Proven for the predecessor only: tenant-authenticated persistence/readback and the exact browser failure above.
- Not yet proven on `158b84c52112d3125d5080bd8cda4df6533fb0a9`: build, quality, session-handoff, data-quality runtime, Phase-F resilience, final certification, full-browser business journey, live deployment or production proof. No prior-head PASS is transferred to this head.
- Do not mark `PRODUCT_COMPLETE` and do not merge PR #912.

### One next action
Read the current Actions for exact head `158b84c52112d3125d5080bd8cda4df6533fb0a9`; when Full Product Browser E2E completes, inspect its result.json and attached artifacts, then fix the first actual failure on the new head before rerunning the required gates.
