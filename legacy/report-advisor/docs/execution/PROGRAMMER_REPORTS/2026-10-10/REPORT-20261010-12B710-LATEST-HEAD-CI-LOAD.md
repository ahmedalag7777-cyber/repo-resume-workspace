# EXECUTION REPORT — 2026-10-10T22:05:00+03:00 — latest-head CI load control

Repository: `Report-Engainall/Report-Advisor`  
Branch: `fix/source-bound-generic-intelligence-20261009`  
PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED  
Code/CI checkpoint: `12b7106504aaeec247803e3ada311129ee495467`  
Base/main: `fa1ab4cbade9b01685507aa966c10f700a03f576`  
Product complete: NO

## Product and source-lineage changes already committed
- Reports Center honors exact `reportJobId + sourceHash` and rejects silent substitution: [d51bb6f](https://github.com/Report-Engainall/Report-Advisor/commit/d51bb6fe22a55da9f2533708983d6c05e08a5974).
- Full Product Browser has visible generic-layer assertions for source path, SHA, job ID, signals and recommendations even if a specialty exists: [ae75608](https://github.com/Report-Engainall/Report-Advisor/commit/ae75608296a7bdff7d271e87439dace0f3817eb8).
- Generic engine/card was already present; the generic format regression previously logged `GENERIC FILE ANALYSIS PASS`.
- Staging-only `saved_views` schema-parity migration `20261010165742` is applied and read back: 9 columns, 4 constraints, 3 indexes, RLS enabled, policy bound to current tenant + `auth.uid()`, authenticated CRUD and zero anon grants.

## Root cause proven
Supabase Auth logs on Staging recorded repeated internal connection failures to `localhost:5432` for `supabase_auth_admin`. Log aggregation:
- 18:35–18:50 UTC: 81 password-token 504s and 25 token 500s, from up to nine source IPs.
- 18:50–18:56 UTC: another 54 token 504s and 500 failures including `context deadline exceeded` / internal Postgres connection timeout.
GitHub Actions status showed multiple in-progress older-head E2E runs simultaneously: Full Product, Device-Independent, Storage Tenant Runtime, Commercial Product Creation, Evidence Passport, Phase-F and Report Cohort.

## Executed CI controls
- [81c6b39](https://github.com/Report-Engainall/Report-Advisor/commit/81c6b393c587f37d1c7e8750f01b65fa907f29b1): bounded retry for transient pre-query Postgres connection failures only.
- [e9d5de6](https://github.com/Report-Engainall/Report-Advisor/commit/e9d5de68122601a2a6f9a1d5c08b12b50bc0c9b3): fixed retry diagnostic regression assertion; Phase-F local operational tests passed on e9.
- [e77c919](https://github.com/Report-Engainall/Report-Advisor/commit/e77c919510ff3d7e9dd0d3708427855975a4d438): duplicate authenticated E2E in Device-Independent is manual-only; Full Product is the authenticated PR gate.
- [6a3cc01](https://github.com/Report-Engainall/Report-Advisor/commit/6a3cc0148845e1e05344b5d2590559db3762a21e): matched Device-Independent group name to its workflow file contract.
- [12b7106](https://github.com/Report-Engainall/Report-Advisor/commit/12b7106504aaeec247803e3ada311129ee495467): newest-head cancellation on same-workflow E2E, Phase-F, cohort, Storage, Commercial and Evidence gates; Phase-F is filtered to resilience-relevant changes, not docs-only.
Old workflow runs that started before these settings are not retroactively covered and may finish later.

## Current-head run state observed for `12b7106504aaeec247803e3ada311129ee495467`
Queued/pending: Full Product [38077978966](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077978966), Device-Independent [38077979075](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077979075), Phase-F [38077979117](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077979117), Report Cohort [38077978974](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077978974), Build [38077979233](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077979233), Quality [38077979087](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077979087), Data Quality [38077979172](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077979172), Handoff [38077979084](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077979084), Storage [38077979196](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077979196), Commercial [38077979063](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077979063), Evidence Passport [38077978905](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38077978905).
- Older cohort [38076567370](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38076567370) passed 40 report cases and uploaded artifact 11679650509, but that result is from old head 2d77663.
- Phase-F on e9 passed local operational tests/canary/provenance but live probes had not completed when checked; no restore PASS claimed.
- Prior Final Certification failed because of the Device group prefix; corrected at 6a3cc01, pending current-head proof.
- Netlify remains the free preview path; Vercel is currently blocked by a free build-rate limit. Production has not been promoted.

## Single next action
Read the latest-head run completions and logs, fix the first reproduced failure, then prove upload → visible full general/specialist intelligence → persistence/readback → refresh/re-entry preserves source SHA. Keep PR open; product complete remains NO.
