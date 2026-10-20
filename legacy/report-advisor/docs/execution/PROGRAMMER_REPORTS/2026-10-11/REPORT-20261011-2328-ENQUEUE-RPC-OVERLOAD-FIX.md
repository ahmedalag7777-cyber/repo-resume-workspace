# LIVE EXECUTION REPORT — 2026-10-11 23:28 +03 / ENQUEUE RPC OVERLOAD REPAIR; EXACT-HEAD BROWSER RETEST PENDING

REPORT_FOR_HEAD = 39187072a37e20e2b1fe35551a734d38bd0ac484
UPDATED_AT = 2026-10-11T23:28:00+03:00
SESSION HANDOFF = awaiting fresh exact-head proof.
Repository = Report-Engainall/Report-Advisor
Branch = fix/source-bound-generic-intelligence-20261009
PR = https://github.com/Report-Engainall/Report-Advisor/pull/912 (OPEN / NOT MERGED)
Main/base last verified = fa1ab4cbade9b01685507aa966c10f700a03f576
Code/test baseline = 39187072a37e20e2b1fe35551a734d38bd0ac484
Product status = NOT COMPLETE; DO NOT MERGE.

## 1. Exact live failure

Full Product Browser E2E 38170744962 failed on head 1b981cdf061e0fa0666a1ef22514ace52d84ffb9; artifact 11714390242:
https://github.com/Report-Engainall/Report-Advisor/actions/runs/38170744962
https://github.com/Report-Engainall/Report-Advisor/actions/runs/38170744962/artifacts/11714390242

The certified report تقارير ارصدة المخزون.pdf passed the source/context checks: reportJobId=8dbafdf8-f769-4c4f-97a5-22eac8b47d41, source hash sha256:3e945a181e766f2e2a50ea765a2db40d57a5c6049481b8e208be10a59d328839, 254 rows, quality 98. The journey then failed when a fresh three-row marker.csv source tried to use canonical import (importId=352ebeb5-107e-41aa-80e4-7a7ae0621c78, tenant=f68a7e91-3c7e-46fb-97a8-e339bec04e13, source hash sha256:9f4a21067bd56ce6cb6b8f2449e974ba4f9cede36d06e02d5808036e287f9c94).

The import job persisted as failed with processed/valid/invalid counts all zero, while its parse summary recorded three rows valid. Supabase Edge logs recorded HTTP 300 at /rest/v1/rpc/enqueue_report_execution_job at 2026-10-11T20:16:47.231Z. The error was obscured later as [object Object].

## 2. Root cause proven from Staging

Read-only pg_proc inspection proved two overloaded signatures:
- enqueue_report_execution_job(uuid,text,text,text,text[],integer): defaults on arguments 5-6; execute granted to authenticated and service_role, not anon.
- enqueue_report_execution_job(uuid,text,text,text,text[],integer,boolean): defaults on arguments 5-7; execute granted to service_role only.

The seven-argument overload's trailing p_force_reprocess DEFAULT false (plus defaults before it) made ordinary six-argument payloads match both overloads, producing HTTP 300. This is the first failure demonstrated by that run. Separate no-JWT/tenant-B 401/42501 responses are expected denial and are not a reason to weaken RLS/permissions.

## 3. Applied Staging repair and readback

Applied migration to staging project fnqbvfuwbdpwvhcgzksl:
20261011202515_disambiguate_enqueue_report_execution_job_rpc_overloads

Matching repository migration:
supabase/migrations/20261011202515_disambiguate_enqueue_report_execution_job_rpc_overloads.sql

The seven-argument overload was recreated with all seven arguments required. The six-argument overload was not modified. Explicit REVOKE ALL from PUBLIC, anon and authenticated plus GRANT EXECUTE to service_role restored the original least-privilege boundary.

Database readback:
| Overload | Defaults | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE | SECURITY DEFINER |
|---|---:|---|---|---|---|
| Seven arguments (force reprocess) | 0 | false | false | true | true |
| Six arguments (normal enqueue) | 2 | false | true | true | true |

No anon grant or tenant policy relaxation was performed.

## 4. Repository commits and code changes

- a914eb5986fd52ee37fca55ed5eb7bf305208a3b adds the migration, preserves structured PostgREST error fields (message/code/details/hint/status) in netlify/functions/canonical-import-execute.mts, and extends scripts/check-report-execution-e2e-contract.mjs to guard overload defaults and least-privilege grants.
- 39187072a37e20e2b1fe35551a734d38bd0ac484 puts the PASS log after all new regression assertions.
- The code commits used [skip ci] intentionally to allow a docs-only handoff checkpoint to trigger the next full exact-head validation.

## 5. Pre-fix gate statuses only

On 1b981cdf061e0fa0666a1ef22514ace52d84ffb9:
- Quality 38170744670 PASS
- Product Build Gate 38170745052 PASS
- Phase-F Live Resilience 38170744888 PASS
- Session Handoff Contract 38170744823 PASS
- Final Certification Gate 38170745003 PASS
- Device-Independent Browser E2E 38170744904 PASS
- Storage Tenant Runtime E2E 38170744546 PASS
- Data Quality Runtime 38170744814 PASS
- Commercial Product Creation E2E 38170745041 PASS
- Full Product Browser E2E 38170744962 FAIL

The prior PASS results do not certify a914eb5/3918707. The new exact-head batch is pending.

## 6. Still unproven

No post-fix authenticated browser run has shown generic import progress through durable enqueue, canonical commit, rendered output and database readback. Same-source identity still needs proof across the main intelligence, evidence, decision and work-center screens following navigation, page refresh and re-entry. No product-complete or merge claim is justified.

## NEXT_EXACT_ACTION

Read the live PR head after this docs-only commit and inspect its new workflow batch. Open Full Product Browser E2E first. If the generic CSV run fails again, capture the actual structured error (now preserved) and repair that first proven defect. Require successful canonical import and result readback with the same report job and source hash across all relevant screens. Keep PR #912 OPEN and PRODUCT_COMPLETE=NO.