# Report — 2026-10-11 — Inventory General Intelligence Surface Repair

REPOSITORY = Report-Engainall/Report-Advisor
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = https://github.com/Report-Engainall/Report-Advisor/pull/912 (OPEN / NOT MERGED)
CODE_TEST_HEAD = 08a1ac3464cd7ba818cf09287e3a83a852291681
CODE_TEST_PARENT = 9bd1902902a01422590123a0d13f2a78e5658e35
GOVERNANCE_BASELINE = 08a1ac3464cd7ba818cf09287e3a83a852291681
MAIN_BASE = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO
DO_NOT_MERGE = true

## Live evidence collected before the fix

On exact parent `9bd1902902a01422590123a0d13f2a78e5658e35`:
- Product Build Gate [38160613528](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38160613528): PASS.
- Quality [38160613269](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38160613269): PASS.
- Data Quality Runtime [38160613476](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38160613476): PASS.
- Phase-F Live Resilience [38160613515](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38160613515): PASS.
- Session Handoff Contract [38160613659](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38160613659): FAIL.
- Final Certification Gate [38160608535](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38160608535): FAIL.
- Full Product Browser E2E [38160613377](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38160613377): FAIL.

## First failures and their actual causes

### 1) Session Handoff / Final Certification
The actual log is `SESSION_HANDOFF_CONTRACT_FAIL: stale report; unreported files: .github/workflows/phase-f-live-resilience.yml`.

The report baseline remained at `a298e522ebcf76b19d154026db4afc0a3cdf7327`, so the strict changed-file calculation included the Phase-F workflow change from commit `9bd1902902a01422590123a0d13f2a78e5658e35`. The workflow edit adds comments and classifies the root report archive and exactly `.github/workflows/phase-f-live-resilience.yml` as non-shipped runtime provenance; other application/API/function/build-config changes remain fail-closed. Neither the handoff checker nor its allowlist was relaxed. This checkpoint advances `REPORT_FOR_HEAD` to the code/test head `08a1ac3464cd7ba818cf09287e3a83a852291681`; only persistent governance records change in the following commit, so the handoff contract can verify this update against an accurate baseline.

### 2) Full Product Browser E2E
Artifact `11710353371`, `full-product-browser-proof-38160613377`, contains `artifacts/e2e-business/result.json` with:
- `status=FAIL`
- exact head `9bd1902902a01422590123a0d13f2a78e5658e35`
- exact error **`inventory: intelligence panel missing`**

The test passed upload/canonical report persistence and the Smart Report, Reports Center, executive, trust, decision and work surfaces, then failed only at `source-bound-surface:inventory`.

The report context independently read back:
- reportJobId: `8dbafdf8-f769-4c4f-97a5-22eac8b47d41`
- source path: `تقارير ارصدة المخزون.pdf`
- source hash: `sha256:3e945a181e766f2e2a50ea765a2db40d57a5c6049481b8e208be10a59d328839`
- canonical row count: 254
- quality score: 98
- trust state: `TRUSTED`
- evidence state: `AWAITING_EVIDENCE_SNAPSHOT`

Thus the first proved business-screen defect was missing intelligence UI, not missing source identity or database readback.

## Code changes prepared on exact product head `08a1ac3464cd7ba818cf09287e3a83a852291681`

- `src/components/CustomerReportSurface.tsx`: the actual `/reports/inventory` source-bound route now renders the existing `GenericFileIntelligenceCard` with the report's independent `genericIntelligence`, source path, SHA-256, reportJobId, canonical coverage and source-snapshot status, and also renders the existing `ReportIntelligencePanel`. The domain-specific metrics and business-data explorer remain intact; the generic layer is added, not substituted for the specialist/domain view.
- `scripts/smart-report-complete-intelligence-surface.test.mjs`: added regression guards so this exact domain component must mount both surfaces and pass through source identity/analysis-scope props.
- Code commit: [`08a1ac3464cd7ba818cf09287e3a83a852291681`](https://github.com/Report-Engainall/Report-Advisor/commit/08a1ac3464cd7ba818cf09287e3a83a852291681).
- The code is **IMPLEMENTED, NOT YET EXACT-HEAD TEST-PROVEN**. The browser E2E must be rerun on the final governance checkpoint before claiming a pass.

## Separate diagnostic — not the Chromium root cause

The non-blocking real-source 48-archetype preflight reported 21 supported and 27 not proven. Its target job was under a different tenant than the actor (`targetVisibleToActorTenant=false`). This is a separate diagnostic/tenant-visibility gap; it must not be represented as the cause of `inventory: intelligence panel missing`.

## Governance checkpoint

The next commit updates the append-only memory, session state, current report and this archive. The current report baseline is set to `08a1ac3464cd7ba818cf09287e3a83a852291681` so the handoff contract sees only the document/archive changes in the subsequent commit. No historical reports are deleted; no gates are weakened; PR #912 remains open.

## NEXT_EXACT_ACTION

After the governance checkpoint is published, read the exact-head Session Handoff, Build, Quality and Full Product Browser E2E runs. Verify that the inventory surface now visibly renders the general intelligence and shared intelligence panel, then address the next actual failure from exact-head evidence. Product completion, full 48-archetype proof and production-current proof remain NOT PROVEN.
