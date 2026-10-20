## CURRENT EXACT-HEAD EVIDENCE/EXECUTION SEMANTICS — 2026-09-30

- Exact source/report trust separation is mandatory: `TRUSTED` describes source quality; `PENDING_EVIDENCE` / `AWAITING_EVIDENCE_SNAPSHOT` describes report verification.
- Canonical commit coverage is independent from evidence acceptance. `canonicalCommitVerified=true` may not promote report verification.
- A canonical coverage gap is explicit: source/analysis row count may exceed authoritative canonical row count; the authoritative count and gap are persisted and surfaced. This project currently has a proven 399/397 example with gap 2.
- `reportVerificationState` is derived as `GAP_DETECTED` when a positive canonical gap exists, otherwise `VERIFIED` only when persisted evidence acceptance is explicitly VERIFIED, otherwise `PENDING_EVIDENCE`.
- `recover_completed_report_execution_result` rejects `evidenceStatus=VERIFIED` during recovery. Evidence acceptance remains a separate authority.
- The in-memory report queue/coordinator implementations are compatibility-only leaf surfaces. Production source may not import them. The execution-boundary contract verifies this dependency boundary.
- Exact current-SHA CI proof on `3c6dd2d...`: Typecheck PASS, Build PASS, Lint PASS, row-coverage contract PASS, release readiness PASS, deterministic execution batch PASS. These are current-SHA proofs; they do not constitute browser proof.
- Browser proof remains separate from database/CI proof. No authenticated current-SHA browser result has been established.
- Vercel build-rate-limit is external hosting evidence and must not be conflated with GitHub exact-SHA build proof.

## CURRENT REPORT EVIDENCE-STATE RECONCILIATION — 2026-09-30

- Exact repository lineage → `0e9a3cc37c54b0ecd2b95dd8ab884275f2e6d751`.
- Current source `sha256:aeee5e6a7c5c5b23891bf68169de6acf9683267b3ac9828c6cea430128b2d300` has no matching `kpi_evidence_snapshots.source_evidence` record in the Staging tenant.
- Therefore its rendered evidence state is correctly persisted as `AWAITING_EVIDENCE_SNAPSHOT`, while `TRUSTED` remains a separate source-quality state.
- `recover_completed_report_execution_result` now fails closed on `evidenceStatus=VERIFIED`; recovery cannot act as an evidence-acceptance authority.
- Canonical commit proof remains separate: 735 canonical dataset rows and 735 canonical import-commit rows are read back independently.
- This distinction is mandatory:
  `CANONICAL_COMMIT` does not imply `EVIDENCE_VERIFIED`.
- A future evidence acceptance path must provide its own source-bound evidence/provenance before any `VERIFIED` state is committed.

## CURRENT LIVE SOURCE-RECORD RECOVERY RECONCILIATION — 2026-09-30

- Exact repository fix → `22fb675a634adeb29d60a432fe995f4b589b1e59`.
- Root issue reproduced on Staging: a completed durable report had authoritative source hash/canonical rows, but its import result summary still pointed to an older pending file record/storage path.
- Canonical recovery rule → a completed report may finalize only against a company-scoped `file_records` row whose `file_hash` exactly matches the durable source hash, whose `security_status` is `passed`, whose status is `ready|processed|verified`, and whose storage bucket/path are present.
- Recovery is fail-closed when no matching verified source record exists.
- Recovery updates the existing `import_jobs.file_record_id`, source fingerprint and result-summary provenance only; it does not rewrite canonical dataset rows.
- Live verification → current report now points to file record `071db872-2f17-4acf-8374-b1e2d9852985`, storage path `.../5925f3a2-fbac-4678-9490-b892dca35d4d.pdf`, exact source hash, security `passed`, status `ready`; canonical dataset count remains 735 and canonical import commit count remains 735.
- Recovery contract keeps execute permission restricted to `service_role`; `public`, `anon`, and `authenticated` are revoked.
- This proof is Staging-specific and does not transfer to production/browser certification.

## CURRENT LIVE SECURITY RECONCILIATION — 2026-09-27

- CURRENT CODE CANDIDATE → PR #672 / `9aa6c8ccea82b20d949ae2e41fdad2f1b1126631`.
- The live migration-lineage drift for `import_finish_job(uuid,text,jsonb,text)` was identified and repaired on staging without changing its business lifecycle body.
- LIVE RESULT → SECURITY INVOKER; `search_path = public, pg_catalog`; EXECUTE only for authenticated/service_role plus postgres owner; no public/anon EXECUTE.
- The canonical six-argument `import_commit_batch` remains SECURITY DEFINER by design, but its source-hash, storage, fingerprint, file-status, tenant/company, job-binding, and idempotency checks remain authoritative; public/anon EXECUTE is revoked and authenticated/service_role execution is granted.
- RLS remains enabled on `import_jobs`, `file_records`, `canonical_import_commits`, and `import_job_rows`.
- SECURITY ADVISOR still reports 46 historical authenticated SECURITY DEFINER findings plus the leaked-password-protection warning. No blanket revoke is authorized; these remain separate audit fronts until canonical ownership and callers are proven.
- This live proof is environment-specific and does not become browser/production PASS or transfer to another SHA.


# MASTER DATA / TRUTH / SECURITY REFERENCE — الأغبري
Status: CANONICAL DOMAIN REFERENCE

## 1. Truth model
The product must distinguish:
- source fact
- extracted fact
- normalized fact
- validated fact
- canonical fact
- derived metric
- analytical signal
- recommendation
- decision
- outcome

A later state must never be shown as authoritative before its prerequisite state exists.

## 2. Evidence model
Consequential outputs should preserve:
- source
- provenance
- source hash where applicable
- calculation/metric reference
- period / As Of
- freshness
- tenant
- confidence / quality state
- transformation lineage where applicable

## 3. Tenant isolation
Every tenant-sensitive path must prove:
- authenticated identity
- current_company_id
- database RLS
- query scoping
- write scoping
- readback isolation

A/B tenant evidence must be explicit when a gate requires it.

## 4. Database change law
Before migration/RPC/grant changes:
1. inspect current schema
2. inspect callers
3. inspect RLS
4. inspect grants
5. inspect target identity
6. identify canonical path
7. apply smallest safe change
8. test real read/write behavior
9. verify business readback

No blanket revoke or destructive cleanup based only on a security-advisor finding.

## 5. Deterministic business truth
No authoritative business KPI should be invented or generated by a language model.

AI may explain, summarize, synthesize and assist investigation.

AI must not replace:
- database truth
- deterministic calculations
- tenant security
- provenance
- approval controls

## 6. State semantics
Use:
VERIFIED, TRUSTED, PARTIAL, REVIEW, BLOCKED, INSUFFICIENT DATA, INSUFFICIENT SAMPLE

Unknown is not zero.
Unavailable is not success.
No evidence is not confidence.

## 7. Import/document truth
Unified ingestion is source-first and tenant-bound.

No target-entity selection may be required before understanding the source.

Commit is true only after authoritative DB commit.

## 8. Security invariants
Forbidden:
- browser service-role session
- fake JWT
- tenant bypass
- guessed credentials
- synthetic production evidence
- weakened acceptance criteria for PASS

## 9. Financial semantics
Current product contract is YER.

Profitability requires verified cost basis.

Receivables data alone must not be represented as guaranteed recoverable money.

Forecasting and benchmark outputs must expose minimum-data/sample limits.
