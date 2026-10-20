# EXECUTION CHECKPOINT — 2026-10-11 23:56 +03 / ENQUEUE RPC TENANT-BOUNDARY FIX

REPORT_FOR_HEAD = 5d983f95cb1db6d3b27210e2d7b82d41b03a54e7
UPDATED_AT = 2026-10-11T23:56:47+03:00
REPOSITORY = Report-Engainall/Report-Advisor
BRANCH = fix/source-bound-generic-intelligence-20261009
PR #912 = https://github.com/Report-Engainall/Report-Advisor/pull/912 (OPEN / NOT MERGED)
MAIN_BASE = fa1ab4cbade9b01685507aa966c10f700a03f576
SOURCE_FIX_COMMIT = https://github.com/Report-Engainall/Report-Advisor/commit/5d983f95cb1db6d3b27210e2d7b82d41b03a54e7
STAGING_MIGRATION = 20261011205504_bind_enqueue_report_execution_job_wrapper_to_authenticated_tenant
PRODUCT_COMPLETE = NO; DO_NOT_MERGE = true.

## Root cause
Phase 2 Security closure [38174168107](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38174168107) failed on predecessor 4029661bb38681e6f2878efc150eb8eeb3a79944. Its log identifies `20261011203457_restore_tenant_bound_legacy_enqueue_report_execution_job_overload.sql` and says the six-argument `public.enqueue_report_execution_job` definition lacked authenticated user/tenant binding or an explicit service_role-only boundary.

## Implemented and verified
Applied the forward migration `20261011205504_bind_enqueue_report_execution_job_wrapper_to_authenticated_tenant` to Staging project `fnqbvfuwbdpwvhcgzksl`. The matching SQL file and test assertions are in source commit [5d983f95cb1db6d3b27210e2d7b82d41b03a54e7](https://github.com/Report-Engainall/Report-Advisor/commit/5d983f95cb1db6d3b27210e2d7b82d41b03a54e7).
The normal six-argument wrapper now uses PL/pgSQL SECURITY DEFINER with fixed `pg_catalog` search_path; rejects null company IDs; requires `auth.uid()` for non-service callers; reads `public.current_company_id()`; rejects `p_company_id IS DISTINCT FROM v_company_id`; and delegates only with the force-reprocess flag false.
Regression checks require those guards, the search path and explicit ACL statements, and reject PUBLIC/anon grants.

Staging database readback:
- Six-argument normal enqueue: defaults=2; SECURITY DEFINER=true; anon EXECUTE=false; authenticated=true; service_role=true; direct auth/current-company/tenant equality checks present.
- Seven-argument repair/force-reprocess enqueue: defaults=0; SECURITY DEFINER=true; anon=false; authenticated=false; service_role=true.
- No anon grant and no RLS relaxation were performed.
- Latest Security Advisors: 46 authenticated SECURITY DEFINER warnings and 1 leaked-password-protection warning; open findings, not claimed as cleared.

## Evidence boundary
- Phase 2 Security [38174168107](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38174168107) FAILED on predecessor `4029661...`.
- Full Product Browser E2E [38174168164](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38174168164) was pending on predecessor `4029661...`; it is not new-head proof.
- Older PASS results from `7e5bf5c...` are historical only. Exact-head CI, authenticated browser completion, production proof, and cross-screen durable source identity remain open.

## NEXT EXACT ACTION
Read fresh exact-head results after this docs checkpoint. Inspect the first failed step and artifact, fix only the evidenced root cause, then prove fresh upload → canonical commit → generic intelligence render → DB readback → same reportJobId/sourceHash across Smart Report, Evidence, Decision and Work Center after navigation/refresh/re-entry. Keep PR #912 open and PRODUCT_COMPLETE=NO.
