# Master Execution Index — Append-Only Cycle 015→017 Ledger

This file is an append-only extension to `docs/MASTER_EXECUTION_INDEX.md`. Historical index content is intentionally not rewritten.

## CYCLE-015
- Start HEAD: `9c449b548d3feedbe8f55d54d652cb73287b1abd`
- Workstream: decision/recommendation/alert lifecycle mutation boundary.
- Discovery: `src/lib/decision-automation/vertical-slice-runtime.ts` directly inserted into lifecycle-sensitive tables.
- Fix: tenant-authoritative RPCs; authenticated direct INSERT revoked; real consumer migrated; fail-closed regression guard added.
- Staging evidence: authenticated INSERT denied on recommendations, business_intelligence_decisions, alerts.
- Defect discovered during verification: SECURITY DEFINER RPCs initially retained default PUBLIC EXECUTE.
- Follow-up fix: public/anon EXECUTE revoked; authenticated-only grants restored.
- PR: #122
- Merge SHA: `775e1f81be6b3785e4c90ab1f3a30f10d6cd85d4`
- PR quality: SUCCESS run `2429` on PR head `5cdcb29a13ba45d3a4114d3942ce912705831205`.

## CYCLE-016
- Start HEAD: `775e1f81be6b3785e4c90ab1f3a30f10d6cd85d4`
- Workstream: recommendation outcome mutation boundary.
- Discovery: `src/lib/analytics/outcome-feedback.ts` directly upserted `recommendation_outcomes`.
- Fix: `record_recommendation_outcome` RPC; authenticated INSERT/UPDATE/DELETE/TRUNCATE revoked; consumer migrated; PR-gated regression guard added.
- Staging evidence: authenticated direct mutation denied; RPC EXECUTE granted; SECURITY DEFINER ACL has no PUBLIC/anon execution.
- PR: #123
- Merge SHA: `37e6e46f06ccea72bc6946c67d3162dbd4662e40`
- PR quality: SUCCESS run `2430` on PR head `ab0abf2dfe03f3edd21ac185e86abe364c8cab14`.
- Exact merged-head CI: not yet proven by the available commit-run query; do not promote PR evidence to merge-head certification.
- Deployment status: Vercel status failure is `build-rate-limit`; external blocker.

## CYCLE-017
- Start HEAD: `37e6e46f06ccea72bc6946c67d3162dbd4662e40`
- Workstream: recommendation outcome provenance/truth invariants.
- Discovery: CYCLE-016 RPC boundary preserved tenant authority but did not enforce application-level evidence provenance and known-outcome value completeness at the database boundary.
- Fix: `record_recommendation_outcome` now requires `evidence_snapshot_id`; positive/negative/neutral outcomes require expected and actual impact; decision reference remains same-tenant only.
- Regression: existing outcome DML boundary workflow extended with provenance guard.
- Staging evidence: hardened RPC applied; function ACL is `postgres`, `authenticated`, `service_role` only; no PUBLIC/anon execution.
- PR: #124 (open at ledger append time).

## Cross-cycle security evidence
- Staging `SECURITY DEFINER` inventory after CYCLE-016/017: no PUBLIC or anon ACLs on inspected SECURITY DEFINER functions.
- Staging lifecycle table mutation check: authenticated direct mutation is denied for recommendation outcomes and CYCLE-015 lifecycle tables.
- Storage/RealtIme live checks: no repository/runtime usage currently found; staging has no configured storage buckets/policies, so these remain unproven rather than falsely certified.

## Remaining work delta after CYCLE-017
- Closed: three client-side lifecycle DML bypass classes (recommendation/decision/alert creation; recommendation outcome persistence) plus outcome provenance gap.
- Closed: default PUBLIC/anon execution exposure introduced by CYCLE-015 was detected and corrected before production promotion.
- Still open: exact-head CI on merged HEADs; authenticated A/B runtime; live business corpus reconciliation; document corpus runtime; Windows watcher lifecycle; backup/restore; deployment binding; production certification.

## CYCLE-021 APPEND-ONLY ENTRY
- Start HEAD: `6c9cf1a1d4b47bfd0865a899736634e2ccb298c8`
- Workstream: stale PR #92 value extraction into an evidence-first decision/report product journey.
- PR forensics: document gateway provenance logic was already present on current main; it was reused rather than duplicated. Unique usable value was the decision lifecycle/product-experience contract and user journey surfaces.
- Real delta: added fail-closed product truth states; Decision Experience route; Executive Report route; journey navigation; lifecycle/outcome regression tests.
- Test-the-test guard: runtime outcome/evidence claims are explicitly false until canonical runtime evidence is available; illegal decision transitions are rejected.
- PR: #130
- Head SHA before final CI: `a874f4a6b188af1560da3db9355d11a774206096`
- Final branch SHA after type-hardening: `a874f4a6b188af1560da3db9355d11a774206096`.
- Fresh CI: current head has fresh PR check suites; quality run `33288207409` is still `IN PROGRESS` at append time. Other relevant checks on this exact head have completed successfully.
- Merge status: PR #130 remains unmerged until all required fresh checks finish.
- Production certification: NO.

## CYCLE-020 FOLLOW-UP NOTE
- Windows watcher PR #127 remains open and unmerged. Native filesystem callbacks were observed previously while application delivery was not; the branch was corrected to process the event filename directly, await rescan work, stabilize partial files, and run the Windows workflow on relevant `desktop/**` changes rather than only the old watcher branch.
- This remains runtime-unproven until a fresh Windows workflow executes against the corrected head.

## CYCLE-022 APPEND-ONLY ENTRY
- Start HEAD: `647abfc79914fba6ae98280e5e66a2bc68249410`.
- Workstream: certification evidence integrity / release-control tenant boundary.
- Discovery: `production_certification_bundles` and `production_rollback_drills` were exposed to `authenticated` through broad `FOR ALL` RLS policies, while the certification release gate consumed persisted pass booleans. This allowed an authenticated tenant actor with table write privilege to potentially manufacture release evidence; this was a real security/truth-boundary defect.
- Fix: added `supabase/migrations/20260830200000_certification_evidence_write_lockdown.sql`; authenticated INSERT/UPDATE/DELETE/TRUNCATE revoked on both certification evidence tables; authenticated access reduced to tenant-scoped SELECT only.
- Live schema repair: the authoritative Supabase project did not yet contain the certification evidence tables, so the prerequisite Phase-M schema migration was applied first, followed by the write lockdown migration. This exposed and corrected a repository/live migration-parity gap rather than assuming the tables existed.
- Live verification: both tables now have RLS enabled; authenticated SELECT is allowed; authenticated INSERT/UPDATE/DELETE/TRUNCATE are all denied; tenant SELECT policies use `company_id = current_company_id()`.
- Repository regression: `scripts/check-certification-evidence-write-boundary.mjs` verifies the privilege and policy boundary and includes a comment-decoy test-of-test.
- Report queue continuation: defensive cloning was previously added for nested report execution request state; fresh CI status remains separate evidence and is not promoted automatically.
- Production certification: NO. This cycle closes a concrete evidence-forgery write path but does not substitute for live A/B, deployment, restore, Windows, or authenticated E2E evidence.

## CYCLE-023 APPEND-ONLY ENTRY
- Start HEAD: `647abfc79914fba6ae98280e5e66a2bc68249410`.
- Workstream: make the certification-evidence and report-queue adversarial checks continuously executable in CI.
- Real delta: added `.github/workflows/certification-evidence-boundary.yml`, running the certification write-boundary gate, report-queue immutability gate, and queue test-of-test on main pushes, pull requests, and manual dispatch.
- Live verification remained green for the certification evidence boundary after the Phase-M schema prerequisite and lockdown migrations: RLS enabled; authenticated SELECT only; authenticated write privileges denied on both evidence tables.
- Fresh CI status for the newest repository HEAD remains pending; no CI PASS is claimed until the workflow executes against that exact SHA.
- Production certification: NO. Continuous source-level enforcement is strengthened; runtime A/B, authenticated E2E, restore drill, Windows, deployment binding and live production evidence remain separate requirements.

## CYCLE-024 APPEND-ONLY ENTRY
- Start HEAD: `34acaf22b6cc81f2544c852329c6033c73bffa56`.
- Workstream: production certification truth completeness.
- Discovery: `certifyProduction()` could previously reach `certified=true` from the 95% score threshold without requiring every canonical evidence key to exist and pass. This created a potential truth collapse where omitted mandatory evidence could be mistaken for successful certification.
- Fix: mandatory canonical evidence keys (`tenant`, `backup`, `rollback`, `artifact`, `security`) are now required; missing/failed mandatory evidence becomes a blocker; duplicate evidence keys are rejected.
- Adversarial regression: `scripts/check-production-certification-adversarial.mjs` checks missing/failed/duplicate evidence handling and includes a test-of-test against comment-decoy markers.
- CI integration: the certification evidence boundary workflow now executes the certification completeness adversarial gate alongside the write-boundary and report-queue adversarial gates.
- Latest repository HEAD: `3b5bba92c9e3315e2de8b0b5b0f2b8f0c51e8e33`.
- Exact-head status: Vercel reports `failure` solely because deployment is rate-limited for 24 hours; this is an external deployment blocker and is not treated as application certification evidence.
- Production certification: NO. Mandatory source-level evidence semantics are hardened; live deployment, A/B tenant isolation, authenticated E2E, restore/RPO/RTO, Windows and production telemetry remain open.
