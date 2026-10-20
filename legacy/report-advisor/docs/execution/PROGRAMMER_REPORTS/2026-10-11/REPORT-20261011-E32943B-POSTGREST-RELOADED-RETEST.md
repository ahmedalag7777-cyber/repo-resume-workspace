# Execution report — 11 October 2026 — PostgREST reload and current-head evidence

**Repository:** `Report-Engainall/Report-Advisor`  
**Branch:** `fix/source-bound-generic-intelligence-20261009`  
**PR:** [#912 — feat: complete source-bound generic file intelligence](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED  
**Exact code/test HEAD observed:** [`e32943bc3bfa54ec60c791b7852ffe8f227fd604`](https://github.com/Report-Engainall/Report-Advisor/commit/e32943bc3bfa54ec60c791b7852ffe8f227fd604)  
**Base:** `fa1ab4cbade9b01685507aa966c10f700a03f576`  
**Product status:** `PRODUCT_COMPLETE = NO`

## What changed in this launch
No application source code was changed in this checkpoint. The staging PostgREST schema cache was reloaded and the live project was inspected read-only. This deliberately records current truth before retrying integration runs.

## Root cause / recovery evidence
The prior failure logs show PostgREST was unable to load its schema cache because a PostgreSQL metadata query was cancelled with SQLSTATE `57014` (statement timeout), producing API-side `PGRST002`. The staging-only reload notification was received by PostgREST at `2026-10-11T14:36:47Z`. Its logs then reported schema query in 1703.5 ms and cache loaded in 8.1 ms at `2026-10-11T14:36:49Z`. Read-only SQL shows:
- `get_report_value_cohort_candidates(integer,uuid)` exists.
- `idx_report_value_cohort_candidates_source` exists.
- `report_evidence_passports` exists.
- The RPC executes directly and yields a source-bound report record; this is DB proof, not REST/browser proof.
- No waiting locks and no active queries older than 10 seconds at probe time.

## Exact-head CI evidence already available
- [Quality 38086314388](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38086314388): PASS.
- [Product Build 38086314341](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38086314341): PASS.
- [Data Quality Runtime 38086314335](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38086314335): PASS.
- [Device-Independent Browser 38086314251](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38086314251): smoke PASS; not authenticated product E2E.
- [Full Product Browser E2E 38086314147](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38086314147): FAIL before the reload.
- [Report Value Cohort 38086314337](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38086314337): FAIL before the reload.
- [Evidence Passport Gate 38086314205](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38086314205): FAIL before the reload.
- [Phase-F 38086314164](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38086314164): FAIL; terminal cause not yet assessed in this launch.
- [Netlify PR preview](https://deploy-preview-912--aghbari-report-advisor.netlify.app): deployment status success. Vercel is externally rate-limited.
- None of the above is a completed authenticated upload-to-refresh business journey.

## Product/source truth
The live HEAD is `e32943bc3bfa54ec60c791b7852ffe8f227fd604`, not the old historical SHA in the launch instruction. The latest commit changed cohort eligibility so real user uploads are no longer excluded based only on names such as `customer-*.csv`; known synthetic fixture records are excluded by file metadata. Existing generic + specialty composition and comprehensive result rendering remain intact.

## Remaining blockers
1. Reinspect current-HEAD run logs and establish whether failed cohort/browser/passport jobs were only blocked by the pre-reload PGRST002.
2. Obtain exact-head source-bound browser proof: real report identity and SHA-256 hash must remain constant through all signals/recommendations/evidence render, save/readback, route navigation and refresh/re-entry.
3. Resolve any independent Phase-F, Session Handoff, Evidence Passport or final-certification failures on the first concrete failed step.
4. Do not merge or claim production completion while these gates remain unresolved.

## Next single action
Inspect the terminal failed steps on the three current-head jobs (Full Product Browser, Report Value Cohort and Evidence Passport Gate); rerun only the failed jobs if the logs confirm they were caused by the pre-reload PostgREST schema-cache timeout.
