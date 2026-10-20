## ARCHIVED EXECUTION REPORT — 2026-10-10T18:45:00+03:00 — lineage restore parity + bounded cohort diagnostics

SESSION HANDOFF = READY
REPORT_FOR_HEAD = 242c072a1293346109edd3a67cd45a438f53d359
UPDATED_AT = 2026-10-10T18:45:00+03:00
REPOSITORY = Report-Engainall/Report-Advisor
APPLICATION_CODE_HEAD = 242c072a1293346109edd3a67cd45a438f53d359
BRANCH = fix/source-bound-generic-intelligence-20261009
PR = #912 OPEN / NOT MERGED
MAIN_HEAD = fa1ab4cbade9b01685507aa966c10f700a03f576
PRODUCT_COMPLETE = NO

### Executed changes and database results

- The strict, source-bound legacy import reconciliation migration was applied to staging twice under two migration ledger versions. It only changes rows where source fingerprint, secured file hash, rendered row count, analyzed rows/quality, canonical commit rows, and canonical dataset rows are identical, with zero invalid rows. Its proof is persisted in `import_jobs.result_summary.legacyRowCountReconciliation`.
- Readback proves 49 reconciled import records and 49 linked passports as `VERIFIED / READY / FULL`; unresolved repaired reports = 0. The change does not relax the evidence gate.
- Read-only staging inspection found another restore schema gap, `public.report_cell_lineage`, which the live schema has but a clean logical restore lacks. Its schema, constraints, indexes, RLS, tenant policy and grants were observed, and the matching restore migration was applied to staging at version `20261010153717`. This candidate adds the migration file and an audit contract to GitHub.
- Existing VOI parity migration remains tracked and protected by migration-audit assertions.

### CI evidence and root causes

- Quality [38062418605](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38062418605): PASS at `242c072a1293346109edd3a67cd45a438f53d359`.
- Product Build Gate [38062418545](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38062418545): PASS at `242c072a1293346109edd3a67cd45a438f53d359`.
- Session Handoff Contract [38062418613](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38062418613): PASS at `242c072a1293346109edd3a67cd45a438f53d359`.
- Full Product Browser E2E [38062418281](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38062418281): FAILED overall. Its route scan passed; business E2E generated a failure report. The source-bound report lineage matches the same source hash/path/job and 332 canonical rows; later DB readback confirmed its passport was already `VERIFIED / READY / FULL`.
- Device-Independent Browser E2E [38062418614](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38062418614): FAILED due to HTTP 500 / Postgres `57014 statement timeout` in report routes while multiple heavy workflows were running. A read-only `EXPLAIN ANALYZE` on a representative canonical source-row query took ~4.6 ms and returned 776 rows from 6,776 source-bound rows, indicating transient DB contention rather than absence of data.
- Report Value Cohort [38062418457](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38062418457): FAILED before it logged its candidate pool, with the same `57014 canceling statement due to statement timeout`. The candidate RPC ran in ~139 ms during a quiet window and returned 42 eligible source-bound candidates; target is 40.
- Phase-F [38062418646](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38062418646): 3/4 probes passed; backup restore failed on the missing `public.report_cell_lineage` relation. This migration repairs that concrete schema gap; exact-head restore proof is still pending.
- This update bounds retries for SQL statement timeouts to one retry and emits safe structured request-path/stage diagnostics. Other transient HTTP errors keep their ordinary bounded backoff. It does not mark failed DB calls as PASS.

### Next exact action

Run the new exact-head gates with the lineage migration and diagnostic instrumentation. Confirm Phase-F restore passes, cohort reaches its candidate/read stages and closes 40 reports, and both browser suites complete without `57014` responses. Keep PR #912 open; product completion remains NO until end-to-end source upload, Smart Report rendering/navigation/reload/readback and evidence-linked decision/workflow proof are all readback-proven.

---

