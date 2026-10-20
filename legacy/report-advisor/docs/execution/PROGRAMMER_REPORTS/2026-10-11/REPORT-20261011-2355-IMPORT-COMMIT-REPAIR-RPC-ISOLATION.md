# EXECUTION CHECKPOINT — 2026-10-11 23:55 +03 / ISOLATE CANONICAL REPAIR RPC AND RETEST

REPORT_FOR_HEAD = 9d756cf1409b0e29eb1bc08d9a22ade0090088ac
UPDATED_AT = 2026-10-11T23:55:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
BRANCH = fix/source-bound-generic-intelligence-20261009
PR #912 = https://github.com/Report-Engainall/Report-Advisor/pull/912 (OPEN / NOT MERGED)
MAIN_BASE = fa1ab4cbade9b01685507aa966c10f700a03f576
SOURCE_FIX_COMMIT = https://github.com/Report-Engainall/Report-Advisor/commit/9d756cf1409b0e29eb1bc08d9a22ade0090088ac
PRODUCT_COMPLETE = NO; DO_NOT_MERGE = true.

## Proof and root cause
Full Product Browser E2E 38172444159 on predecessor 242d5462e3febc1fa615e3db9e583b79ecd6c8c9 failed at import_commit_batch with PGRST203; artifact 11714956740:
https://github.com/Report-Engainall/Report-Advisor/actions/runs/38172444159/artifacts/11714956740
The three-row marker.csv reached durable enqueue then failed because the normal six-argument import_commit_batch RPC was ambiguous with the seven-argument repair-only function. Failed job id: 098a8fa0-cb75-4330-95b5-9a5a8426170a.

## Change applied
Commit 9d756cf1409b0e29eb1bc08d9a22ade0090088ac:
- Makes src/lib/import/canonical-commit.ts route repairExistingSource calls through import_repair_commit_batch and keeps normal commits on import_commit_batch.
- Adds migration supabase/migrations/20261011205000_disambiguate_import_commit_batch_repair_rpc.sql to rename the existing privileged function in place, revoke PUBLIC/anon/authenticated, grant EXECUTE only to service_role, then notify PostgREST to reload schema.
- Adds static regression assertions in scripts/check-report-execution-e2e-contract.mjs.

Staging project fnqbvfuwbdpwvhcgzksl was read back:
| RPC | defaults | anon | authenticated | service_role |
|---|---:|---|---|---|
| import_commit_batch (6 args) | 0 | false | true | true |
| import_commit_batch (5 args) | 2 | false | false | true |
| import_repair_commit_batch (7 args) | 0 | false | false | true |

## Exact status boundary
No new-head E2E has yet proven the fix. Prior predecessor passes must not be copied forward. Netlify production is still on last observed commit 858ef8e3e5bc5bf74430555eadfb9e6767be348b, not this repair.

## NEXT EXACT ACTION
After committing and rereading this checkpoint, inspect fresh exact-head Full Product Browser E2E and its result artifact. Prove marker.csv canonical commit, rendered intelligence, DB readback and matching reportJobId/sourceHash across Smart Report, Evidence, Decision and Work Center after navigation/refresh/re-entry. Recheck all quality/build/handoff/data-quality/tenant/Phase-F/recovery/final-certification/browser gates on the actual source head, then align and test production. Never merge PR #912 until that evidence exists.