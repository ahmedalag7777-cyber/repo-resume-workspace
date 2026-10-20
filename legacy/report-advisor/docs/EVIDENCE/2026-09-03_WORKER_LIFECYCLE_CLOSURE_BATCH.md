# Worker Lifecycle Closure Batch — 2026-09-03

## Exact-SHA transition
- Previous code/test candidate: `5dbf20f4f376896a58f9e8110b9fc813b5069967`
- Release-blocking defect was proven at the live DB boundary; candidate freeze was legitimately broken only for this RCA/fix.
- New code/test head after the fix: `0d0ad3d07a62132c4ee411894869c743c3fceafa`

## 1. Executed
1. Audited live `public.report_execution_jobs` schema, indexes, constraints, and worker RPC inventory.
2. Inspected live definitions of `claim_report_execution_job`, `heartbeat_report_execution_job`, `advance_report_execution_checkpoint`, `complete_report_execution_job`, `fail_report_execution_job`, and `retry_report_execution_job`.
3. Correlated the live regression to migration `20260901005857_report_execution_worker_lifecycle.sql`, which had replaced the previously hardened failure transition and removed the terminal `dead_letter` branch.
4. Recovered the earlier hardened invariant from commit `4955a1e56e4d7b5d692e3fb909bca7d97ba32434`, then restored it as a new forward migration.
5. Applied the corrective migration directly to the live Supabase project without creating persistent test data.
6. Added a repository DB-contract regression test covering terminal dead-letter transition, structured error preservation, locked search_path, and public/anon execution revocation.
7. Confirmed the new commit triggered exact-head GitHub workflows; desktop-windows and Execution Enforcement were observed queued for the new head.

## 2. Defect / root cause
### Proven defect
`fail_report_execution_job` returned `status='failed'` unconditionally, even when `attempt >= max_attempts`.

### Why this was release-blocking
The database schema explicitly permits `dead_letter`, and the queue contract already treats max-attempt terminal failures as non-retryable. The live SQL implementation therefore had a DB/runtime semantic mismatch: the durable database state could never enter the terminal dead-letter state through its failure RPC.

### Root cause
A later worker lifecycle migration replaced the prior hardened `CASE WHEN attempt >= max_attempts THEN 'dead_letter' ELSE 'failed' END` behavior with an unconditional `status='failed'` assignment.

## 3. Fix
The new migration:
- preserves structured error payloads and rejects null/non-object failure payloads;
- sets `dead_letter` when the claimed attempt reaches `max_attempts`, otherwise `failed`;
- clears lease ownership and expiry on failure;
- preserves the locked `pg_catalog` search_path and fully qualifies the application relation;
- keeps the worker failure RPC unavailable to `public` and `anon`, with `service_role` execution only.

## 4. Live runtime regression evidence
Two isolated transaction/rollback tests were executed against the live Supabase project:
- `max_attempts=1`: claim → fail produced `dead_letter`; subsequent retry returned false; transaction rolled back.
- `max_attempts=2`: claim → fail produced `failed`; retry returned true and restored `queued`; a null error payload was rejected with the structured-error exception; transaction rolled back.

No persistent production/staging test row was retained.

## 5. Tests / test-the-test
- Existing in-memory worker adversarial regression already covers idempotent enqueue, active lease exclusivity, stale fencing tokens, lease expiry, ownership-token rotation, terminal cancellation, retry attempt count, dead-letter non-reclaimability.
- New DB contract test adds a source-level guard specifically against recurrence of the migration regression.
- Live DB runtime tests exercise both retryable and terminal branches and the malformed error boundary.
- Initial live SQL test attempt failed only because the anonymous PL/pgSQL block syntax was invalid (`DECLARE` outside `DO`); it was corrected and the actual product runtime test then passed. No product defect was inferred from the harness syntax error.

## 6. Bypass / edge cases checked
- tenant context binding through `current_company_id()`
- active lease ownership
- expired lease rejection
- max-attempt terminal transition
- below-max retry transition
- malformed/null failure evidence
- dead-letter non-retryability
- structured error preservation
- locked SECURITY DEFINER search_path
- public/anon execution revocation
- stale candidate SHA vs new fixed SHA boundary

## 7. Mutation record
- Supabase migration applied: `restore_report_execution_dead_letter_terminal_transition`.
- Git migration: `supabase/migrations/20260903160000_restore_report_execution_dead_letter_terminal_transition.sql`.
- Git regression test: `scripts/report-execution-worker-db-contract.test.ts`.
- Git commits: `697d0ec68ea649b913f6c4e5576939fdbece8a65` then `0d0ad3d07a62132c4ee411894869c743c3fceafa`.
- No production deployment/alias mutation, backup, restore, rollback, or secret/control-plane mutation performed.

## 8. Gates
### Newly strengthened
- Worker durable failure lifecycle: **FIXED + LIVE-RUNTIME-PROVEN at DB boundary**.
- Terminal dead-letter semantics: **LIVE-RUNTIME-PROVEN**.
- Retryable failure semantics: **LIVE-RUNTIME-PROVEN**.
- Structured failure evidence: **LIVE-RUNTIME-PROVEN**.
- Worker failure RPC privilege boundary: **RESTORED / FAIL-CLOSED**.

### Still blocked
- Authenticated browser E2E.
- Live Tenant A/B browser isolation.
- Auth leaked-password protection control.
- Storage runtime.
- Realtime runtime/productization decision.
- Backup/restore/RPO/RTO.
- Rollback/forward recovery/DR.
- Windows exact-head evidence consumption.
- Final certification.

## 9. Next autonomous batch
- Poll and consume exact-head CI results for `0d0ad3d07a62132c4ee411894869c743c3fceafa`.
- Continue semantic truth and document/OCR closure sweeps.
- Continue performance/query-bound/N+1 adversarial checks.
- Continue UI/export parity and stale-SHA evidence mismatch search.
- Do not introduce another mutation unless a new release-blocking defect is proven.
