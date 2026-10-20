# Execution report — 2026-10-12 — Real-source provenance and visual polish

- Repository: Report-Engainall/Report-Advisor
- Branch: fix/source-bound-generic-intelligence-20261009
- PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912), open and not merged.
- Code head: [bf7268bb6e4b](https://github.com/Report-Engainall/Report-Advisor/commit/bf7268bb6e4b1397b1e1335be5fb1bf81c7d3b19)
- Product complete: **NO**.

## Code changes

1. [Workspace landing-route fix](https://github.com/Report-Engainall/Report-Advisor/commit/75f64f4b631b0da07fd9171eb6ef293798c79c34): removed the AppShell one-shot latch preventing saved workspace default route preferences from applying after a user returned to `/`.
2. Added shared real-source provenance classifier and regression test. Real-source matrix selection receives the exact report-job source_path, and evidence passport refresh checks the matching job's source_path before refresh. Test-fixture segments and explicit synthetic catalog/type are excluded.
3. Added the provenance regression step to Full Product Browser E2E.
4. Appended a small design-system refinement in `src/index.css`: ink/indigo/brass accents for executive and import surfaces; semantic status colors remain unchanged.

## Browser evidence

[Full Product Browser E2E run 38275049594](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38275049594), on prior code head `75f64f4b631b0da07fd9171eb6ef293798c79c34`, completed:
- Build exact SHA
- Canonical heart regressions
- Source-bound open report server proof
- Real Chromium route and authenticated browser proof
- Real Chromium business journey and smart-report proof

At last read the same run was still processing the source-matrix stage. These passed steps are not a completed full-workflow result and are not exact-head proof for `bf7268bb6e4b1397b1e1335be5fb1bf81c7d3b19`. Current-head validation remains pending.

## Source integrity blocker

The earlier matrix artifact in [run 38192806591](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38192806591) reported 23/48 supported and 25 NOT_PROVEN. Several records cited paths under `tests/fixtures/realistic-reports/`, documented as test fixtures in that directory's README. The prior classifier relied on `report_corpus` metadata and did not inspect the report job's path. The new shared classifier screens both file-record metadata/paths and the exact job source path, and the passport refresher shares the same rule. Real-source coverage can decline after test fixtures are rejected; this is an integrity safeguard, not permission to weaken the 48/48 gate.

## Not proven

Exact-head Build/Quality/Handoff/Phase-F, full authenticated Browser E2E including the revised real-source matrix, Final Certification, persistent cross-screen identity after refresh/re-login, and the published production build/route remain unproven. Keep PR #912 open.

## Next action

Read the new exact-head workflow runs and fix the first actual failure. Require eligible non-fixture source evidence for all 48 archetypes; no synthetic source may be relabelled as real.
