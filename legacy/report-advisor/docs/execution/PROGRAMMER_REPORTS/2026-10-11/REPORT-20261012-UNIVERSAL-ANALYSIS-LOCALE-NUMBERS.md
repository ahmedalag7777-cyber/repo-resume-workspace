# Execution report — 2026-10-12 — Universal analysis with locale numeric evidence

- Repository: Report-Engainall/Report-Advisor
- PR #912: open, not merged
- Code/workflow head: a14e7f5ca0eb545234f4d0d79ac4b5f846383d17
- Product complete: NO
- Updated: 2026-10-12T18:01:00.287Z

## Universal file analysis scope

The app must analyse any file format it supports. The 48 archetypes are optional specialists. This change set keeps authenticated source-bound report execution and generic format tests as mandatory acceptance, with the real-source specialty matrix recorded separately as diagnostic evidence.

## Implemented

- src/lib/file-engine/generic-intelligence.ts now falls back to the existing locale-aware parseNumber routine for raw/persisted string values not already converted to numbers.
- scripts/generic-file-analysis.test.mjs verifies the generic numeric summary retains Arabic-Indic numbers ١٬٢٣٤٫٥ and ٢٬٠٠٠٫٠, including 2/2 numeric rows and a correct source-derived total.
- .github/workflows/full-product-browser-e2e.yml no longer uses continue-on-error: true (which fails workflow-batch-integrity). The optional specialist-matrix step handles execution failures explicitly, emits a NOT_PROVEN fallback JSON artifact if no matrix result was written, and does not fabricate PASS.
- Workflow path filters include generic-file tests and their customer-facing/matrix contracts so these regressions trigger the browser proof workflow.
- Universal browser acceptance checks the authenticated route and real smart-report journey; optional 48-profile matrix results remain visible and separate.

## Verified predecessor evidence

Full Product Browser E2E run [38286123095](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38286123095) completed PASS on predecessor 03b7abc87932db59c38f83be0b6d4b8e1ae5512a. The generic format test, route/authenticated browser proof, smart-report business journey, optional matrix diagnostic, universal browser evidence gate and artifact upload passed. This run predates the new Arabic numeric regression and cannot be claimed as proof for a14e7f5ca0eb545234f4d0d79ac4b5f846383d17.

On predecessor 8bc57d37a8b955881ab10a3ee0781904f09ae080, Build and Quality passed, while Final Certification failed because workflow-batch-integrity rejected continue-on-error: true. That specific issue is fixed in a14e7f5ca0eb545234f4d0d79ac4b5f846383d17; new exact-head certification is running.

## Current verification

At report time:
- Full Product Browser E2E: [38287728412](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38287728412), in progress on a14e7f5ca0eb545234f4d0d79ac4b5f846383d17.
- Product Build Gate: [38287731449](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38287731449), in progress.
- Quality: [38287728112](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38287728112), in progress.
- Final Certification: [38287728226](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38287728226), in progress.
- Phase-F: [38287728212](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38287728212), pending/in progress.
- Handoff [38287722677](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38287722677) was a stale-report failure; the current state/report now anchor to a14e7f5ca0eb545234f4d0d79ac4b5f846383d17, so read the successor run rather than reusing the failed result.

The previous specialty matrix measured 18/48. That is a limitation in real-source specialist coverage, not a requirement for generic analysis. Production is still on old SHA 858ef8e3e5bc5bf74430555eadfb9e6767be348b; live production parity is not proven.
