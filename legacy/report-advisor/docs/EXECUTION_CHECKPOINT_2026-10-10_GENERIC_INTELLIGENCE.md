# Execution Checkpoint — 2026-10-10 — Generic Intelligence Across All File Types

## Repository and exact state

- Repository: `Report-Engainall/Report-Advisor`
- Pull request: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912), open and not merged
- Branch: `fix/source-bound-generic-intelligence-20261009`
- Product code HEAD at entry: `0e3821e960c4138b6073c2ad26fff13b6de8fe9b`
- Documentation checkpoint commit: `3823e34a0b953cd959d8ade4ee87a4228f3493fd` (moves branch head; product logic above remains the exact reviewed code parent)
- Main base SHA from PR metadata: `fa1ab4cbade9b01685507aa966c10f700a03f576`
- Previous historical SHA supplied by user, `ab292d6cfd9ca948b362c0a975cc38cb489ada24`, is stale relative to the live PR head and must not be used for proof.

## Work verified before product continuation

1. GitHub direct writes succeeded. Commit `c951d7228ee1802536c40177f0b22347e7ffb816` changes `netlify/functions/canonical-import-execute.mts` to select `evidence` before recovery and preserve the report `sourceHash`, `sourcePath`, and `importId` in recovered rendered output.
2. Commit `0e3821e960c4138b6073c2ad26fff13b6de8fe9b` adds source-lineage assertions to `scripts/check-report-execution-e2e-contract.mjs`.
3. Both files were read back from the same branch after commits; the expected strings were present.
4. This does not prove the test script executed; no local checkout/runtime execution is available through the GitHub connector itself.

## Current source findings

- `src/lib/report-smart.ts`: generic dataset/intelligence is built, but subsequent eligibility gates can clear the base intelligence and return `emptyReportIntelligence`. Source-derived descriptive analysis should remain visible even when decisions/recommendations are gated; eligibility gates must remain in place for consequential actions.
- `src/pages/SmartReportPage.tsx`: `GenericFileIntelligenceCard` is only rendered when `!report.specialty`, suppressing the general layer when a specialist is inferred.
- `src/pages/ExternalFileAnalysisPage.tsx`: preview general intelligence is also conditional on the absence of an inferred specialty.
- `src/components/GenericFileIntelligenceCard.tsx`: the current card truncates signal evidence to five, and inspection/guidance to eight; it does not yet expose the full available set.
- `src/lib/universal-report-intelligence.ts`: `previewIntelligence` replaces the base/rule-set intelligence object wholesale; that seam should combine compatible general and specialized results instead of selecting one.
- Existing core files must be preserved and repaired at the assembly/display seams; no parallel analysis engine is to be built.

## Live gate snapshot at pre-checkpoint PR head

- Commit combined status: CodeRabbit success; Vercel pending.
- Product Build Gate run `38011206476` was in progress at last read.
- Full Product Browser E2E run `38011206342` was queued, with `browser-e2e` queued. A queued job is not a pass.
- Numerous certification, security, and contract workflows were queued or in progress. Refresh on the next checkpoint; do not infer their terminal states from this note.
- Open adjacent PRs observed: #911 (`e2d1c2736035cf483d0446b5f662a48d49c34cc9`), #909 (`5c691ae4e18e6589e071b2c96cad6f006385b456`), #906 (`7d91d49774f75c3dd64132f8b4193ba3a3642f5b`), and #882 (`84c4e3cd0c7be784ef760d5535bd74708bc5e407`). Review the current diffs for overlap before duplicating existing changes.

## Required next implementation

1. Inspect exact current source ranges and existing tests.
2. Compose the general content-derived analysis with specialist intelligence only when applicable, preserving stable IDs and deduplicating evidence. Do not convert missing/weak data into zero or inflate confidence/quality.
3. Make the Smart Report and uploaded-file analysis UI expose the general layer for both specialized and unspecialized files, and render complete signal/recommendation/evidence sets without arbitrary list truncation; display source identity and bounds.
4. Add executable regression assertions for both specialist and no-specialty routes and for completeness of evidence lists.
5. Test `test:generic-file-analysis`, `test:smart-report-complete-intelligence-surface`, `test:report-execution-e2e-contract`, plus typecheck/build via exact-head GitHub checks. Consume Full Product Browser E2E and verify the same job ID/source hash after navigation/reload before claiming source-bound journey proof.

## Product completion boundary

The product remains **IN PROGRESS**. A static contract, passing build, public preview, or queued browser job alone does not prove the user journey, persisted readback, or source-bound intelligence on varied file formats.

## Exact first action on resume

Read the live PR head/check statuses after the checkpoint commit; then make the smallest source-bound intelligence composition and UI exposure patch, followed by focused tests and a new immutable report. Do not rebuild the platform from scratch.


## Implementation delta — 2026-10-10

Candidate product commit before this documentation writeback: `9caca7cf54c6c9d1d902e694e6fa5906a04890c4` (PR #912; OPEN / NOT MERGED).

- Added `src/lib/report-intelligence/compose-intelligence-layers.ts` to merge general-source results with applicable specialist results, deduplicate on stable IDs, union evidence, retain general-only and specialist-only signals/recommendations, and choose the more cautious health state.
- Updated `universal-report-intelligence.ts`, `ExternalFileAnalysisPage.tsx`, `report-smart.ts`, and `SmartReportPage.tsx` to keep general intelligence available on both preview and persisted routes regardless of specialty.
- Exposed the general layer separately on `SmartReportDetail`, while merging it into the main intelligence object for the other report surfaces.
- Reworked `GenericFileIntelligenceCard.tsx` so all available signals, recommendations, evidence, drivers, findings/risks/opportunities and measurement/owner/limitation fields render without the former 5-evidence/8-inspection truncation. The card accepts source path/hash/job ID and renders them.
- Extended `generic-file-analysis.test.mjs` with merge behavior assertions and `smart-report-complete-intelligence-surface.test.mjs` with specialty-independent exposure, completeness and source-lineage assertions.
- These are code/test changes verified by GitHub write/read operations only. **They are not yet test PASS evidence**; no local runtime is connected through this GitHub-only path, and current-head CI is the next verification source.

### First next action
Refresh PR #912 head and CI at that exact SHA; resolve compilation or focused-test failures first. Then validate varied text/XML/YAML/RTF and XLSX source shapes, followed by authenticated browser/persisted readback of the same report job + source hash across navigation/reload.


## Exact CI frontier and immediate correction — 2026-10-10

- Pre-writeback candidate SHA: `0444faab81a75f222db978040e485c59e23b2839`; PR #912 open and unmerged.
- Latest observed combined status: Vercel `pending`.
- Latest observed PR workflows for that SHA include Full Product Browser E2E run `38011635086` (queued), Product Build Gate run `38011635134` (queued), and Commercial PWA E2E run `38011635125` (in progress). Remaining security/certification runs are largely queued/pending. These are not passes.
- Readback verified the general/specialist composition code, the report runtime composition, the source-bound generic card, and the added runtime/static tests. Tests have not yet been executed; the GitHub connector is the available execution surface in this task.
- One code-quality correction included in the next atomic commit: use an explicit optional-list guard before comparing signal priority-reason length. The surface contract also now verifies that the persisted report's general layer feeds the Universal Intelligence chain.
- Exact next step after this commit: query its own current status/workflow runs; then inspect the first terminal failure from Product Build/Focused/Full Product Browser E2E and correct that failure before considering any release claim.


## Verified build failure and exact source repair — 2026-10-10

- Vercel deployment `dpl_AWB56DhZXAZMCPeTafQ4m5x91KPG` failed on SHA `7c0411b67f366a36fda9ff2c0a29c1f173ed6434`: `src/lib/report-smart.ts:985:39`, `Expected ")" but found "genericIntelligence"`.
- Netlify deploy `6ac98f18d2e77d0008483c23` failed on the same SHA, build script exit code 2. This is a source parse problem, not merely a provider failure.
- The complete damaged region is being replaced from the current file offsets; this restores the warning condition and keeps generic descriptive analysis separate from the specialty eligibility/decision gate. Replacement-region text assertions passed; a successful build is not yet proven.
- Pre-repair source blob `11b7ff70a3911930277537326e5bb49fd36e94b0`; parent SHA `7c0411b67f366a36fda9ff2c0a29c1f173ed6434`.
- Next action: read the new commit and its deploy/build results. If parsing/build succeeds, inspect TypeScript/focused tests and then source-bound Full Product Browser E2E. No PASS is pre-claimed.


## Post-repair verification — 2026-10-10

- Repair code SHA: `dee505dc045d577b9015ca7cb2ba06adb00a6f76`; PR #912 remains open, not merged.
- Same-head source readback confirms the `nonBlockingQualityWarnings` condition is syntactically intact and the accidental orphan text is gone.
- Vercel build event for `dpl_A324rGB56uAugR32zA2ZHAgcPgC5` logs `✓ built in 20.37s` and lists emitted bundles for all three modified surfaces (Smart Report, File Lab, general intelligence card). Overall Vercel deployment state/status is still `BUILDING/PENDING`.
- Netlify deploy `6ac98fa3e1c3c9000891b1e6` is `ready`; GitHub deploy-preview status for the exact repair SHA is `success`.
- Product Build Gate and Full Product Browser E2E are still queued/pending. No runtime/readback/browser success yet.
- Next: inspect exact current-head CI and source-bound browser run; fix first real gate error and verify displayed evidence through reload and source-hash readback.


## Repaired-code deployment proof and post-checkpoint head — 2026-10-10

- Code repair SHA `dee505dc045d577b9015ca7cb2ba06adb00a6f76`: Vercel deployment `dpl_A324rGB56uAugR32zA2ZHAgcPgC5` state `READY`; Netlify deploy `6ac98fa3e1c3c9000891b1e6` state `ready`. Combined commit statuses on that exact SHA were success for Vercel, Vercel Deployments – Injaz, Netlify deploy preview and CodeRabbit.
- The branch advanced to docs-only checkpoint SHA `aff08b7819ee50f6ce2aabb07be3d33b8663e82c`. At this newer exact SHA, Netlify preview status is success and Vercel is still pending; the deployment lifecycle for the docs head is separate from the proven code-sha deployment above.
- Current-head Product Build Gate run `38011967171` and Full Product Browser E2E run `38011967276` were queued; quality run `38011967189` queued. These do not establish a pass.
- This proves syntax/build/deploy recovery for the repaired code candidate, not end-to-end user journey, report persistence/readback, or production completion.
- Next: consume current-head Product Build Gate then Full Product Browser E2E, keeping source identity/hash evidence in the final proof.


## 2026-10-10 generic table domain-neutrality correction

## CURRENT EXECUTION REPORT — 2026-10-10 — KEEP GENERAL TABLE ANALYSIS DOMAIN-NEUTRAL

APPLICATION_HEAD = pending-this-commit
PARENT_HEAD = 789700d2f77dbab841ca5e68bc82aced63cf7717
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
DATE = 2026-10-10

WHAT CHANGED IN THIS TRANSACTION =
- Tightened `profileStructuredTable` in `src/lib/file-engine/generic-intelligence.ts`: a table is customer-portfolio-shaped only when there is a real customer identity column (for example customer_name / اسم العميل / اسم الزبون) plus status and totals/month structure. An item/supplier label plus status and total no longer gets a customer-churn interpretation.
- Expanded format assertions to require CSV, JSON, JSONL, XML, YAML examples with generic item/status/total fields remain domain-neutral.
- Corrected a false-positive in the merge regression: the simulated specialist layer now contains only one overlapping signal and its own specialist records, not every generic signal/recommendation from the base. Assertions require the generic-only status signal and reconciliation recommendation to arrive from the general layer, and require both evidence sources on overlapping IDs.
- This preserves the existing core and all source-bound/decision gates.

CURRENT PROOF =
- Parent HEAD read back as `789700d2f77dbab841ca5e68bc82aced63cf7717`, PR #912 open, not merged.
- The code/test changes in this transaction are new; build and runtime tests are not yet proven.
- The prior application SHA `a077dfebea99f8848b086f0b04dbedf83a2d6b17` was Vercel READY; its Vercel/Netlify preview/CodeRabbit statuses were successful. Those results do not transfer to the new fix SHA.
- No current-head authenticated browser or persisted report readback proof. PRODUCT_COMPLETE = NO.

NEXT EXACT ACTION =
Inspect the first terminal new-head build/quality result, repair the first actual failure, then use Full Product Browser E2E to verify the same source hash through upload, saved Smart Report, navigation and reload.


Next: consume exact-head build and runtime test results for the new fix SHA. Do not claim test PASS until the matrix actually ran.


## Test syntax repair and raw-source header safety — 2026-10-10

- Exact application SHA: `0e2fc9b2e7e55a01255cafc1286d4ab0bb506671`; PR #912 open/not merged, branch `fix/source-bound-generic-intelligence-20261009`.
- Repaired the malformed composition-test tail and added a regression that prevents a generic raw `name` column from becoming a customer portfolio solely because mappedField guesses `customer_name`.
- This code/test commit is verified by same-head file readback. Runtime test PASS is not yet proven.
- Latest observed status: CodeRabbit success; Vercel build-rate-limit check; Netlify deploy-preview pending; Product Build Gate #38013524659 queued; Quality #38013525077 queued; Full Product Browser E2E #38013524550 pending.
- Historical XLSX source-hash readback exists for one job, but varied-format authenticated browser persistence/readback remains unproven. Product complete = NO.
- Next: consume a terminal focused workflow log and correct the first confirmed failure before source-bound browser proof.


## 2026-10-10 — final fixture escaping repair

- Application code/test head: `73c5205f75cc9ecf057ad0c5f956f69bc54b6ebe`; PR #912 open/not merged.
- Raw-header customer classification guard remains in place; malformed assertion tail was removed earlier; the test fixture newline escapes now use one backslash per newline. Same-head GitHub readback verifies the source.
- CI remains pending: Product Build Gate #38013755538 queued; Quality #38013755480 queued; Full Product Browser E2E #38013755671 queued. CodeRabbit success; Vercel account build-rate-limit; Netlify deploy preview building/pending.
- Runtime test, authenticated browser flow, varied-format persisted readback and production are not proven. Product complete = NO.
- Next: consume the first terminal focused test log for this exact code head and correct the first verified failure.


## Exact-head generic evidence fix — 2026-10-10 — quality exposed CSV header detector defect

- Code SHA `3d6d04feea0cbb69652020d941b9ba6176b1310e`; PR #912 OPEN / NOT MERGED; main `fa1ab4cbade9b01685507aa966c10f700a03f576`.
- Source changes read back: generic table intelligence now profiles every numeric field, preserves source-linked min/max record ordinals, shows all source category counts/months/recommendation evidence, caps inline text samples only at 100 with explicit total/omission counts, and the Universal Intelligence Chain no longer slices stage evidence to three items. Document adapters with `line_number/text` are routed through generic text analysis rather than mistaken for a business table.
- Runtime truth: parent SHA `d2a611b...` Quality failed first on missing TXT evidence. On this SHA, Quality #11939 `38056756921` reached the CSV case and failed at line 33: `csv row count`, expected 2 but parsed 1. This narrows the next root cause to header detection: valid `اسم الصنف` is treated as a suspicious composite header, allowing a data row to beat the actual header.
- Product Build Gate #994 `38056756845` PASS; header contract #8634 `38056756912` PASS. Quality is NOT PASS. Full Product Browser E2E #9600 pending and #9599 running; Device-Independent Browser E2E #5114 running. Browser/persistence proof remains absent.
- Documentation follow-up is required because Session Handoff Contract #2323 failed on stale report coverage. Correctly located state/report files are `docs/execution/CURRENT_SESSION_STATE.md` and `docs/execution/PROGRAMMER_CURRENT_REPORT.md`.
- NEXT: fix the legitimate Arabic composite-label header case with a regression in `scripts/check-header-detection.mjs`, re-run the exact-head generic matrix, then checkpoint the new hash before the report-only handoff commit. Product complete remains NO.


## Arabic CSV header false-positive correction — 2026-10-10

- Exact code SHA `87fe4f3f28d0c81be5f2547fe56c87ec0c5d3489`; PR #912 open/not merged; main `fa1ab4cbade9b01685507aa966c10f700a03f576`.
- Added safe compound-header exclusions in `src/lib/file-engine/header-detection.ts` for ordinary one-field labels (including Arabic `اسم الصنف`) while leaving unrelated merged PDF headings structurally suspicious.
- Added a regression to `scripts/check-header-detection.mjs` that the legitimate Arabic CSV heading remains the first header row and is not classified as composite.
- Why: Quality #11939 on parent `3d6d04f...` proved the earlier TXT evidence regression progressed, but failed CSV row count (expected 2 rows, got 1) because the parser selected `صنف متأخر` rather than the actual header `اسم الصنف`.
- Earlier code/build state: Product Build Gate #994 passed and header contract #8634 passed on `3d6d04f...`; Quality failed at the CSV row-count test. For new SHA `87fe4f3f28d0c81be5f2547fe56c87ec0c5d3489`, Product Build / Quality results are not yet terminal; Full Product Browser E2E #9601 and Session Handoff #2324 were queued; deploy checks pending.
- A previous Session Handoff failure #2323 correctly exposed stale report coverage; the next report must be anchored at the checkpoint commit after this code SHA and all application changes to be excluded from the report-only diff.
- NEXT: inspect exact-head Quality/Product Build logs for `87fe4f3f28d0c81be5f2547fe56c87ec0c5d3489`, repair the first confirmed failure, then update current execution state/report/archive and validate handoff. Upload-to-persisted-readback/browser proof remains open; product complete = NO.
