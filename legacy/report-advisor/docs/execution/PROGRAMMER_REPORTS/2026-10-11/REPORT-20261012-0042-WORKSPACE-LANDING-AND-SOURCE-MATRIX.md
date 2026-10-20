# Execution report — 2026-10-12 — Workspace landing route and real-source matrix

- **Repository:** Report-Engainall/Report-Advisor
- **Branch:** fix/source-bound-generic-intelligence-20261009
- **PR:** [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912), open / not merged at checkpoint.
- **Implementation commit:** [75f64f4b631b](https://github.com/Report-Engainall/Report-Advisor/commit/75f64f4b631b0da07fd9171eb6ef293798c79c34)
- **Product complete:** NO.

## Change committed

Removed the one-shot `landingAppliedRef` latch from `src/App.tsx`. The root-route effect now evaluates persisted workspace preferences every time the current route changes back to `/`, allowing the selected default landing route to run after the preferences have been saved. No auth, tenant, source, evidence, or certification rule was changed.

## First failure proved from browser evidence

[Full Product Browser E2E run 38192806591](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38192806591) ran against predecessor `fbab01a7b361995cf3f52fdee09ce8957c4087b7`. The route suite reported 32/32 routes passing, but the workspace personalization assertion failed with `WORKSPACE_LANDING_REDIRECT_FAILED:/`. In `src/App.tsx`, the effect marked `landingAppliedRef.current = true` on the first root visit even though no redirect was needed, permanently preventing the saved landing preference from being applied when the user returned to root. The exact fix is committed; fresh browser proof is pending.

## Exact-head predecessor gates

| Gate | Run | Result |
|---|---:|---|
| Product Build Gate | 38192806316 | PASS on predecessor only |
| Quality | 38192806342 | PASS on predecessor only |
| Session Handoff Contract | 38192806576 | PASS on predecessor only |
| Phase-F Live Resilience | 38192806466 | PASS on predecessor only |
| Final Certification Gate | 38192806550 | PASS on predecessor only |
| Device-Independent Browser E2E | 38192806255 | PASS on predecessor only |
| Full Product Browser E2E | 38192806591 | FAIL on predecessor |

## Unresolved release blocker

The governed source matrix on the same browser run remains **23/48 supported; 25/48 NOT_PROVEN**. Diagnostics showed 66 source jobs scanned and a tenant mismatch between the source job and the matrix actor. Keep the whitelist, verified-ready passport, source identity, real-file metadata and 48/48 acceptance checks strict. Do not manufacture data or use synthetic fixtures as real-source proof. The authenticated upload/render/persistence/readback path and deployed production provenance still require current-head evidence.

## Next action

Inspect and capture exact-head Build, Quality, Session Handoff, Phase-F, Full Product Browser E2E and Final Certification for `75f64f4b631b0da07fd9171eb6ef293798c79c34`; repair the next real failure from its artifact/log. Keep PR #912 open and `PRODUCT_COMPLETE = NO` until 48/48 eligible real sources and production proof are established.
