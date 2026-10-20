# Execution report — 2026-10-12 — Universal file analysis baseline

- Repository: Report-Engainall/Report-Advisor
- PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912), open and not merged at time of report.
- Source checkpoint: [26fe15a99cc9](https://github.com/Report-Engainall/Report-Advisor/commit/26fe15a99cc92d86d4bb517807792c2670acd58c)
- Product status: **NOT COMPLETE**
- Updated: 2026-10-12T17:38:11.378Z

## Product scope correction

The accepted product requirement is not “prove that 48 report templates have real-world samples.” It is “analyse any file format supported by the app.” The generic engine must extract source-grounded facts, observable measures, signals, limitations and recommendations when no specialist classification applies. The 48 archetypes are optional specialty interpreters.

## Implementation

1. Reworked `.github/workflows/full-product-browser-e2e.yml`. The authenticated browser and smart-report business journey remain blocking proof. The 48-profile source matrix continues to run and report exact coverage, but as a separate diagnostic. The universal gate no longer includes matrix `NOT_PROVEN` as a product failure.
2. `scripts/real-48-source-matrix-preflight.mjs` accepts an explicit `REAL_SOURCE_MATRIX_DIAGNOSTIC_ONLY=1` mode: it still writes `PASS` or `NOT_PROVEN` and diagnostic JSON, but undercoverage is not a process failure in that optional mode. Without that environment flag, existing strict failure behavior remains.
3. `scripts/generic-file-analysis.test.mjs` now checks an unclassified structured CSV produces generic source-derived signals, findings, a recommendation and a summary while no specialist archetype matches.
4. `scripts/real-48-source-matrix-contract.test.mjs` asserts the workflow keeps universal acceptance separate from optional specialty coverage; the browser workflow invokes this contract.

## Predecessor evidence

On predecessor head `79a34bc8ec78c45bf3de9ce30915fcb2f723475a`, the build, Quality, Handoff, Phase-F and Final Certification passed, as did authenticated browser route proof and the business/smart-report journey. The run's matrix reached `18/48` and returned `NOT_PROVEN`; the old fail-closed wrapper mistakenly made that specialty coverage count as the universal product acceptance result. Run details: [Full Product Browser E2E #38282981740](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282981740).

This report does **not** claim that the new exact source head is validated. The generic-file regression and new workflow contract still need to pass on 26fe15a99cc92d86d4bb517807792c2670acd58c.

## Remaining

Run exact-head CI. Confirm generic-format analysis and the authenticated persisted smart-report journey pass; examine the specialist report separately. Production currently remains at `858ef8e3e5bc5bf74430555eadfb9e6767be348b` and must not be described as running the new code without a later deploy and live verification.
