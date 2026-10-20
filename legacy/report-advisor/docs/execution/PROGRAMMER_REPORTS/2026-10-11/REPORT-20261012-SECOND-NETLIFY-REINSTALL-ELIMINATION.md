# Execution report — 2026-10-12 — Remove duplicate Netlify CLI reinstall

- Repository: Report-Engainall/Report-Advisor
- PR #912: open and not merged
- Source/workflow head: [6f7b815c720d](https://github.com/Report-Engainall/Report-Advisor/commit/6f7b815c720d1ab27f7e2c6ebc15d22f316780c4)
- Product complete: **NO**
- Updated: 2026-10-12T17:21:46.496Z

## Why the first fix was not sufficient

Run [38281581401](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581401) on predecessor 717fcf… failed at Netlify CLI setup because an npm install in the app root tried to resolve @typescript-eslint/visitor-keys@8.71.2, which npm reported as unavailable. The first fix isolated the initial CLI install in RUNNER_TEMP and it passed in the newer run [38282981740](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282981740) on head 79a34bc8…

Review of the same workflow then identified a second copy of npm install --no-save --package-lock=false netlify-cli@27.10.2 in the later “Install deterministic browser tooling” step. The currently running attempt on 79a34bc8… had not yet completed that step when this source repair was committed, so no failure is being claimed for that attempt. This commit removes the second reinstall as well. It now checks the isolated Netlify package, checks existing locked Playwright version 1.63.0, and calls node_modules/.bin/playwright directly to install Chromium.

## Canonical source correction retained

The matrix now resolves the canonical import owner through a committed row anchor bounded by exact tenant and source hash. Read-only SQL confirmed a report analysis import with 610 processed and zero canonical rows, while the persisted commit record anchors 610 valid canonical rows for the same tenant/hash to a successful earlier import. Regression tests cover anchor identity/tenant/hash correctness; source-eligibility and minimum sample requirements are unchanged.

## Predecessor results (not new-head proof)

On head 79a34bc8… Product Build run [38282981415](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282981415), Quality [38282981594](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282981594), Handoff [38282976396](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282976396), and Final Certification [38282976590](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282976590) passed. E2E [38282981740](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282981740) had passed initial isolated CLI installation, preview startup, source-context resolution, 48-archetype engine runtime, and open-report resume/readback; it was still in browser-tool installation when last checked. Phase-F [38282981435](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38282981435) was still active after preview provenance passed.

## Next action

Allow the current predecessor runs to settle; promote the fully documented source update to PR #912, verify the second browser-tool step no longer invokes npm install against the application workspace, then inspect the authenticated Chromium and governed-source matrix results. Keep PR unmerged and PRODUCT_COMPLETE = NO until actual source coverage and production proof meet all criteria.
