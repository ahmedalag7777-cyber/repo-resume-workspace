## ARCHIVED EXECUTION REPORT — 2026-10-10T18:35:00+03:00 — source-bound evidence repair and complete Phase-F governance-path correction

SESSION HANDOFF = READY
REPORT_FOR_HEAD = ce10536ae4eefcc3858a7fe407b9d5cd6a2390f5
UPDATED_AT = 2026-10-10T18:35:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
APPLICATION_CODE_HEAD = ce10536ae4eefcc3858a7fe407b9d5cd6a2390f5
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO

WHAT_I_WAS_ASKED_TO_DO
Resume the existing product without rebuilding the intelligence core; ensure general intelligence is shared across supported readable report formats, specialist analysis augments it, all evidence remains source-bound, screens are connected, and every launch records a reproducible checkpoint.

WHAT_I_ACTUALLY_DID
- Shared header normalization/specialty inference is wired into the two File Lab specialty paths and the generic file test covers spaced English/Arabic headers plus generic headers that must not infer a specialty.
- The browser test now distinguishes the actual source trust label “موثوق” from a pending/review evidence snapshot and does not promote one state into the other.
- Added VOI request schema restore parity migrations and a schema audit contract for the table/index/RLS/tenant policy/grants/checks.
- Reconciled 49 legacy imports using only exact source-bound evidence: 49 unique candidate imports, 49 conflict-free proofs, zero conflicting proofs, rendered rows = analyzed snapshot rows = canonical commit rows = canonical dataset rows; source file hash/fingerprint/passport/snapshot hash match, file is secure, analysis quality >=70.
- Applied the guarded reconciliation migration in staging, wrote its audit proof into import_jobs.result_summary, refreshed the passports, and read back 49 audited imports / 49 VERIFIED-READY-FULL passports / zero unresolved reconciled reports.
- Synchronized the exact Supabase versions 20261010144953 and 20261010145143 as tracked SQL migration files in GitHub.
- Updated the session-handoff contract to allow the required root session-memory file as an explicitly recognized persistence artifact.
- Updated the Phase-F live workflow's preflight provenance comparison to allow only docs/execution/* plus ONE-PROGRAMMER-SESSION-MEMORY.md as governance-only deltas; all other code-file drift remains fail-closed.
- Updated the Phase-F runtime probe's deployment-code equivalence and its contract test to use the same strict governance-only allow-list. The runtime probe is not considered passed until a terminal Phase-F workflow reports the result.

WHAT_IS_PROVEN
- Staging readback after migration: 49 imports carry RECONCILED_FROM_SOURCE_BOUND_PROOF status; 49 associated passports are VERIFIED / READY / FULL; unresolved reconciled reports = 0.
- Report Value Cohort run 38062072330 on predecessor governance head 6bd35572e41936cb335685292fbbc31f28b1b595 passed after the repair. Product Build Gate run 38062072179 and Session Handoff Contract run 38062072369 also passed on that predecessor head.
- The newer product code candidate 2055600a895c05ef8239b6be4014b121d5cea775 had Product Build Gate PASS with TypeScript, production build and all four customer/smart-report/source-upload contracts passing.
- Netlify returned the upload screen with application source SHA 2055600a895c05ef8239b6be4014b121d5cea775. Candidate ce10536... changes the Phase-F provenance gate and is now the newest code candidate; its own Quality, Build, Browser and Phase-F runs are not yet terminal.
- Previous Phase-F attempt on an older head was cancelled before restore probes because the workflow's preflight still rejected the root session-memory file. The current candidate fixes both the workflow preflight and the runtime probe’s code-equivalence rule; a current-candidate PASS is not asserted.
- Current full browser E2E / device-independent browser E2E and Quality tests were still queued on the predecessor branch tip. The source-bound upload → saved report → navigate/reload flow remains an explicit closure gate.

FIRST_ACTIVE_FAILURE
Current candidate runs have been triggered but are not terminal. The critical next proof is a current-head Phase-F run plus authenticated full-browser upload/render/navigation/reload/readback; queued runs do not count as PASS.

ROOT_CAUSE
Legacy import counters were zero despite corroborating row evidence, causing passports to remain PARTIAL; fixed with source-proof-gated reconciliation. Separately, the Phase-F deployment provenance gate duplicated its docs-only allow-list in two places and both omitted the mandatory session-memory file. Both guards now allow only the declared governance paths, not product source drift.

NEXT_EXACT_ACTION
Consume terminal runs for ce10536ae4eefcc3858a7fe407b9d5cd6a2390f5. Confirm preview health reports the application SHA, pass the Phase-F restore probes, and pass full product browser readback on a varied file with the same reportJobId and sourceHash after navigation and reload. Do not merge PR #912 or claim product completion before that evidence exists.

---

