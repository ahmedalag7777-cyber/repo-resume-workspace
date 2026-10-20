# Execution checkpoint — 2026-10-12 / BROWSER REQUEST SCOPE REPAIR

CODE_HEAD = 38b157a3d0e2dbfae658082ea2ce45891cd4cdb8
UPDATED_AT = 2026-10-12T18:27:00Z
REPOSITORY = Report-Engainall/Report-Advisor
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = https://github.com/Report-Engainall/Report-Advisor/pull/912
PRODUCT_COMPLETE = NO
DO_NOT_MERGE = true

WHAT_I_WAS_ASKED_TO_DO = Resume from the live GitHub head, fix the first evidenced real browser-journey blocker without weakening evidence rules, prove generic file analysis independently of the 48 optional specialist archetypes, and save a resumable checkpoint before waiting on new CI.

WHAT_I_ACTUALLY_DID = Inspected the current branch and archived checkpoint, downloaded and parsed the uploaded browser proof artifact from run 38287728412, inspected the exact Chromium route/readback evidence, and queried Supabase logs for the same source-bound decision read. The failing refresh proof had fully rendered report content, six decision-chain cards, matching reportJobId/sourceHash and no browser HTTP/console failures, but the harness retained one pending business_intelligence_decisions request after reload. The harness itself used a single global pending-request Set and global request counter across multiple Playwright pages. Replaced them with per-page WeakMap telemetry, cleared settled first-render background requests before starting refresh-readback measurement, and added scripts/check-browser-e2e-page-telemetry-contract.mjs to enforce the isolation invariant. Wired this contract into .github/workflows/full-product-browser-e2e.yml before the route proof step. Committed the code-only fix as 38b157a3d0e2dbfae658082ea2ce45891cd4cdb8.

FIRST_ACTIVE_FAILURE = Full Product Browser E2E run 38287728412 on predecessor code head a14e7f5ca0eb545234f4d0d79ac4b5f846383d17 failed its final universal browser proof. The uploaded result artifact showed 31 of 32 route checks passing, zero failed routes, zero failed HTTP requests, authenticated session and tenant PASS, and the real business/smart-report journey PASS. One Smart Report refresh-readback check remained NOT_PROVEN because a request to business_intelligence_decisions stayed in the shared pending set. The first render was settled with the expected report markers, all six decision-chain cards and exact source identity.

ROOT_CAUSE = A confirmed harness defect was that pending request state and data-request counts were global across concurrent browser pages, so another page's request could contaminate a route's settlement proof; the refresh path also reused the earlier pending set instead of establishing a clean readback baseline. Supabase edge logs for the same report decision query showed HTTP 200 responses and PostgreSQL logs contained no matching database timeout for that SELECT. The change isolates page-local telemetry and refresh baseline; the new exact-head Chromium run must still prove whether this closes the failure or exposes a separate genuinely slow read.

WHAT_IS_PROVEN = On predecessor a14e7f5…, browser auth and tenant isolation passed, all expected Smart Report content rendered, the real Chromium business/smart-report journey step passed, the separate generic-file-format test printed GENERIC FILE ANALYSIS PASS, and the optional specialist matrix was honestly reported as 18/48 NOT_PROVEN (not a universal generic-analysis gate). On documentation checkpoint 8d8f4eb48d4afcc99228cf3d811be491627d80d4, Build run 38288129915, Quality 38288130237, Handoff 38288130116, Phase-F 38288130008 and Final Certification 38288130345 passed; these are predecessor-only results and are not transferred to this code head. On 38b157a3d0e2dbfae658082ea2ce45891cd4cdb8, Product Build Gate run 38290775338 was in progress and Full Product Browser E2E run 38290775363 was queued at the last live read. Commit link: https://github.com/Report-Engainall/Report-Advisor/commit/38b157a3d0e2dbfae658082ea2ce45891cd4cdb8.

WHAT_IS_NOT_PROVEN = The new page-scoped browser telemetry contract's CI result; exact-head generic-file analysis result; Full Product Browser E2E and refresh readback; exact-head Build, Quality, Handoff, Phase-F and final certification completion; cross-screen persisted source readback after refresh/re-login on this head; and deployed production parity. The production site was last verified on SHA 858ef8e3e5bc5bf74430555eadfb9e6767be348b. PR #912 remains open and unmerged.

NEXT_EXACT_ACTION = Read the live run status for Full Product Browser E2E 38290775363 and the new telemetry-contract step. If the Smart Report refresh now settles, verify that the route, reportJobId, sourceHash and all six rendered cards remain correct and complete all exact-head release gates. If a same-page business_intelligence_decisions request still remains pending, preserve its refreshed artifact and debug that specific request without relaxing the fail-closed browser gate.

SESSION HANDOFF = READY


## Gate links

- New Product Build Gate 38290775338: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38290775338
- New Full Product Browser E2E 38290775363: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38290775363
- Storage tenant isolation 38290775383: https://github.com/Report-Engainall/Report-Advisor/actions/runs/38290775383
