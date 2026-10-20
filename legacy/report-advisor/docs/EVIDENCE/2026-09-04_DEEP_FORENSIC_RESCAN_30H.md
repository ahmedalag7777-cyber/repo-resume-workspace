# Report Advisor — Deep Forensic Rescan & Last-30h Closure Ledger

**Date:** 2026-09-04 02:48 +03  
**Repository:** `Report-Engainall/Report-Advisor`  
**Repository HEAD at this record:** `92d12fb3bc7d2c57eb3e6eb25809e904392e7456`  
**Latest product-code/test HEAD:** `0fa2e6970c5203ca6a36dd7e076162d48a0488c5`  
**Parent product-code mutation:** `e6f27cf5885acc6bb1e29e4cd977e274bad08f16`  
**Assessment mode:** fail-closed, exact-SHA, owner-level execution protocol.

## 1. Executive truth

The repository is substantially implemented, but it is **not 100% release-ready and not production-certified**. The current honest position is:

- **Engineering/product implementation:** ~92%
- **Operational/runtime evidence readiness:** ~76%
- **Production certification readiness:** ~58%
- **Overall closure readiness:** ~83%

These percentages are planning/assessment indicators, not certification gates. Certification remains binary and fail-closed.

The most important distinction is that the product implementation is much further along than the evidence required to certify real operation. CI success, source inspection, fixtures, mocked tests, and deployment readiness do not substitute for authenticated browser evidence, real Tenant A/B evidence, backup/restore, RPO/RTO, rollback/forward recovery, or a final exact-SHA certification bundle.

## 2. Exact-SHA boundary

The newest repository HEAD is `92d12fb3...`, an index/documentation synchronization commit. The newest product-code/test candidate is `0fa2e697...`. The `0fa2e697...` candidate follows `e6f27cf...` and contains the regression contract for the compatibility import-query bound.

No historical PASS or runtime evidence is transferred to `0fa2e697...`. A fresh current-head Quality/certification run is required.

## 3. Repository-wide inventory observed in the existing deep-rescan record

At the preceding deep forensic inventory boundary the repository contained approximately:

- 1,418 tree entries / 1,370 files / 48 directories.
- `src/`: 459 files.
- `scripts/`: 413 files.
- `supabase/migrations/`: 239 migration files.
- `docs/EVIDENCE/`: 16 prior evidence records.
- Golden fixtures for Arabic, English, invoice, headerless, complex, and Onyx inputs.
- Desktop layer: `desktop/main.cjs` + `desktop/preload.cjs`.
- Vercel project: `report-advisor`, framework Vite.

The inventory is treated as a repository baseline; it is not a substitute for runtime proof.

## 4. Last ~30 hours — completed execution

### 4.1 Security / database hardening

- SECURITY DEFINER search paths were hardened to `pg_catalog` and application relations were schema-qualified where required. The earlier real `42P01 relation-not-found` defect was closed.
- Autonomy trust/governance helper search paths were hardened.
- Resilience outbound host validation was hardened for IPv6 and IPv4-mapped IPv6 private targets.
- Rollback/backup verification transport was routed through hardened outbound-fetch boundaries.
- The live staging security surface was previously audited at 81/81 public tables with RLS and 150 policies, with 0 policies targeting `anon` and 0 targeting `PUBLIC` at the later recorded boundary.
- SECURITY DEFINER execution warnings were deliberately not blanket-revoked because several authenticated RPCs are product mutation surfaces and a canonical business-role authority contract is not yet proven.

### 4.2 Governance / execution enforcement

- Index-only changed-file detection was hardened to use real Git ancestry/diff semantics rather than brittle textual/equality assumptions.
- Enforcement was made deterministic around the frozen index boundary.
- Mandatory broad execution-enforcement governance was reconciled with CI topology.
- Adversarial test-of-test coverage was added for under-execution, index-only boundaries, mixed product changes, and governance-anchor removal/weakening.
- Continuous-trust persistence and canonical index references were protected against decoy/missing-table substitutions.
- The current execution protocol explicitly requires parallelism during waiting windows, NEXT+1/NEXT+2 consumption, blocker isolation, test-of-test, exact-SHA evidence separation, execution-debt zero for true stop, and index governance.

### 4.3 Worker / queue

- A real lifecycle defect was identified: `fail_report_execution_job` could leave terminal jobs in `failed` rather than durable `dead_letter` at `attempt >= max_attempts`.
- The terminal transition was restored.
- Live rollback-safe probes previously demonstrated `max_attempts=1` → `dead_letter` and non-retryable behavior; `max_attempts=2` → `failed` then retryable `queued` behavior.
- Error evidence validation, lease cleanup, retry boundary, and service-role execution restrictions were preserved.
- In-memory adversarial coverage already covers idempotency, lease exclusivity, fencing, expiry, token rotation, retry counts, and DLQ non-reclaimability.

### 4.4 Import engine

- Progress counters were hardened to monotonic behavior using `GREATEST` semantics.
- Terminal job progress resurrection was blocked.
- Test-of-test coverage was strengthened for multiline terminal guards and terminal-resurrection paths.
- A new real source-level finding was discovered at the newest boundary: the Vite alias `@/lib/queries` resolves through the compatibility layer, so `src/lib/queries-compat.ts` is a real application path, not dead code.
- `fetchImportRecords()` in the compatibility layer was unbounded; it was fixed to a 500-row bounded query with exact count and explicit `REPORT_QUERY_LIMIT_EXCEEDED` behavior.
- `scripts/check-import-query-bounds.mjs` was extended to protect both canonical and compatibility implementations.

### 4.5 Decision / recommendation / outcome

- One-to-one decision↔recommendation cardinality was hardened with partial unique indexes, same-tenant composite references, row locking, atomic bidirectional update, idempotent replay, and overwrite/reassignment rejection.
- Approval `CANCELLED` was reconciled as a valid terminal state requiring terminal provenance.
- Reopen/terminal consistency was protected.
- Active tenant membership is now required for decision work-item assignees.
- Recommendation outcome provenance was hardened so decision-key outcomes cannot silently omit required decision provenance.
- Existing live scans were clean before these hardenings; rollback-safe probes were used to avoid persistent synthetic fixtures.

### 4.6 Data truth / reports / export

- Canonical dashboard/report RPCs and adapters remain the authoritative truth path.
- Null/unknown/insufficient-data semantics are guarded rather than converted into invented zeroes.
- Report/export paths use bounded/paginated canonical sources and SHA-256 artifact integrity where implemented.
- The compatibility boundary delegates most analytics consumers to canonical implementations.
- The remaining compatibility import-history path was just brought under the same bounded-query discipline.

### 4.7 Storage / Realtime / AI / OCR / watched folder / desktop

- Storage tenant/path/owner-aware policy contracts exist; the previously recorded live bucket count was 0, so no speculative bucket was created.
- Realtime has no current published application table/channel consumer in the recorded live state; this is a requirement-resolution gap, not a fabricated PASS.
- AI/vector capability/routing architecture exists, but tenant-isolated live retrieval/provenance evidence is not certified.
- Document/OCR routing, extraction envelope, provenance and golden fixtures exist, but Arabic Golden Corpus runtime/accuracy/confidence/error evidence remains incomplete.
- Desktop watcher logic includes stability waiting, traversal defense, dedupe, rescan and delete handling. Exact-head Windows evidence remains to be consumed if required.

### 4.8 Production / runtime / recovery

- Vercel production deployments have been inspected and deployment identity verified at prior exact boundaries.
- The deployment for the older `02b6520...` boundary was recorded as READY. It must not certify the newer `0fa2e697...` candidate.
- No production alias mutation is authorized merely to clear certification.
- Backup/restore/RPO/RTO and rollback/forward-recovery safety contracts exist, but real operational evidence remains absent.

## 5. Last-30h exact commit ledger

The Git history query covering `2026-09-02 20:48 +03` through `2026-09-04 02:48 +03` returned the following closure commits. Documentation-only commits are listed explicitly because they affect evidence lineage but do not count as capability closure by themselves.

| Time +03 | SHA | Change | Classification |
|---|---|---|---|
| 2026-09-04 02:40 | `92d12fb3...` | synchronize current execution table after deep rescan | INDEX / DOC |
| 2026-09-04 02:40 | `0e177ed6...` | publish deep forensic rescan | INDEX / DOC |
| 2026-09-04 02:39 | `0fa2e697...` | extend import compatibility query-bound regression | TEST |
| 2026-09-04 02:39 | `e6f27cf5...` | bound compatibility import history reads | FIX |
| 2026-09-03 21:16 | `02b6520a...` | reconcile remote migration history | DB LINEAGE |
| 2026-09-03 21:15 | `bc382168...` | reconcile remote migration history | DB LINEAGE |
| 2026-09-03 21:15 | `f9cdbcf...` | reconcile remote migration history | DB LINEAGE |
| 2026-09-03 21:15 | `c5beb81...` | reconcile remote migration history | DB LINEAGE |
| 2026-09-03 19:53 | `c6499a28...` | enforce index-only changed-file boundary | GOVERNANCE FIX |
| 2026-09-03 19:52 | `6a8e51bf...` | align index-boundary adversarial cases with real Git ancestry | TEST |
| 2026-09-03 17:51 | `a2745721...` | close linked recommendation outcome provenance gap | FIX |
| 2026-09-03 17:45 | `d97db6ad...` | align index-boundary adversarial assertions | TEST |
| 2026-09-03 17:38 | `b98ad7f7...` | require decision provenance for decision-key outcomes | FIX |
| 2026-09-03 17:14 | `afaf25ba...` | preserve recommendation outcome validation contract | FIX |
| 2026-09-03 17:14 | `cde5f37b...` | remove malformed recommendation outcome migration | REVERT |
| 2026-09-03 17:14 | `0ab9d8b9...` | persist recommendation outcome provenance hardening | FIX |
| 2026-09-03 17:11 | `a8503842...` | update execution table for active-assignee hardening | DOC |
| 2026-09-03 17:11 | `8cfaf6e8...` | require active membership for decision work-item assignees | FIX |
| 2026-09-03 16:36 | `a47e9ddf...` | add compact current execution table | DOC |
| 2026-09-03 16:36 | `fc78bfb0...` | lock autonomy SECURITY DEFINER search paths | SECURITY FIX |
| 2026-09-03 16:25 | `d96f095a...` | synchronize latest closure and live truth | DOC |
| 2026-09-03 05:07 | `c346e23a...` | governance enforcement for canonical frozen-index lifecycle | GOVERNANCE FIX |
| 2026-09-03 04:59 | `f20c4d35...` | adversarial test-of-test for continuous-trust persistence | TEST |
| 2026-09-03 04:58 | `cbebc6a6...` | correct continuous-trust persistence contract | TEST |
| 2026-09-03 04:37 | `265cf8ca...` | revert accidental main-branch test isolation file | REVERT |
| 2026-09-03 04:37 | `d66d3706...` | isolate pure archive scanner from Supabase runtime | TEST |
| 2026-09-03 04:16 | `ecfb8b96...` | harden multiline terminal-guard test-of-test | TEST |
| 2026-09-03 04:16 | `8ff964c1...` | correct terminal-resurrection test-of-test | TEST |
| 2026-09-03 04:15 | `da8fd133...` | lock terminal-resurrection guard into lifecycle contract | TEST |
| 2026-09-03 04:15 | `7404809a...` | block terminal job progress resurrection | FIX |
| 2026-09-03 04:14 | `e468481a...` | synchronize exact decision/approval closure head | DOC |
| 2026-09-03 04:12 | `61e8af9d...` | lock CANCELLED terminal consistency into contract | TEST |
| 2026-09-03 04:12 | `27770a46...` | reconcile CANCELLED terminal-state consistency | FIX |
| 2026-09-03 04:11 | `b7a14436...` | lock one-to-one recommendation links into contract | TEST |
| 2026-09-03 04:10 | `225e949c...` | enforce atomic one-to-one recommendation links | FIX |
| 2026-09-03 04:02 | `be53070e...` | record autonomous closure batch 01 | DOC |
| 2026-09-03 04:02 | `b80e1299...` | add import progress monotonic regression | TEST |
| 2026-09-03 03:59 | `0cd6f5a4...` | enforce monotonic import progress contract | TEST |
| 2026-09-03 03:59 | `0960f13e...` | make import progress counters monotonic | FIX |
| 2026-09-03 03:31 | `d00b320b...` | synchronize exact index-only boundary | GOVERNANCE |
| 2026-09-03 03:27 | `2f3c7be3...` | accept governed enforcement-only index boundary | GOVERNANCE FIX |
| 2026-09-03 03:25 | `addadd479...` | record O2 live browser tenant evidence | EVIDENCE |
| 2026-09-03 03:23 | `bd49dd3f...` | reject mixed product changes at enforcement boundary | TEST |
| 2026-09-03 03:23 | `cf78304c...` | isolate enforcement-contract-only head boundary | GOVERNANCE FIX |
| 2026-09-03 03:21 | `902fc623...` | cover current index-only boundary enforcement | TEST |
| 2026-09-03 03:21 | `f4d312d9...` | enforce index-only boundary against current index head | GOVERNANCE FIX |
| 2026-09-03 02:35 | `df1e9093...` | consume fresh exact-head CI boundary | EVIDENCE |
| 2026-09-03 02:29 | `ab4f25c6...` | reconcile index-only boundary after worker fix | DOC |
| 2026-09-03 02:29 | `d789067c...` | synchronize index to worker lifecycle closure | DOC |
| 2026-09-03 02:28 | `9959aa58...` | record worker dead-letter closure batch | DOC |
| 2026-09-03 02:28 | `0d0ad3d0...` | guard report worker dead-letter database contract | TEST |
| 2026-09-03 02:27 | `697d0ec6...` | restore report worker dead-letter terminal transition | FIX |
| 2026-09-03 02:18 | `2f1146ea...` | record owner-level autonomous closure batch | DOC |
| 2026-09-03 02:10 | `6531a776...` | record assistant-first auth/tenant runtime forensics | EVIDENCE |
| 2026-09-03 02:00 | `2427e2af...` | define owner last-mile execution matrix | GOVERNANCE |
| 2026-09-03 00:01 | `5078bb56...` | refine Arabic dashboard visual system | UI |
| 2026-09-02 23:29 | `79ceb008...` | reconcile multi-front exact-head execution truth | DOC |
| 2026-09-02 23:21 | `3bed44d8...` | synchronize index after security-definer closure | DOC |
| 2026-09-02 23:18 | `5dbf20f4...` | qualify SECURITY DEFINER relations under locked search_path | SECURITY FIX |
| 2026-09-02 22:57 | `7c03d62c...` | normalize markdown delimiters in governance validator | FIX |
| 2026-09-02 22:50 | `6cb7f016...` | sync index to governance enforcement fix | DOC |
| 2026-09-02 22:50 | `27464d5f...` | enforce adaptive governance truth invariants | TEST |
| 2026-09-02 22:35 | `a3a014fe...` | align index with governance validator candidate | DOC |
| 2026-09-02 22:34 | `8e8b5a5b...` | synchronize index after governance adversarial closure | DOC |
| 2026-09-02 22:33 | `7b9ad72b...` | bind adaptive governance anchors to structural sections | TEST |
| 2026-09-02 22:32 | `f4a4fbb8...` | synchronize index after governance validator closure | DOC |
| 2026-09-02 22:32 | `3a8f1049...` | remove redundant index text gate | FIX |
| 2026-09-02 22:30 | `a76233c4...` | synchronize index to governance structural closure | DOC |
| 2026-09-02 22:30 | `fdfbea88...` | enforce structural adaptive governance sections | TEST |
| 2026-09-02 22:28 | `489f91e0...` | reconcile exact code-test head after enforcement drift | DOC |
| 2026-09-02 22:22 | `ed60460d...` | synchronize index with governance adversarial fix | DOC |
| 2026-09-02 22:22 | `62633750...` | strengthen under-execution governance removal attack | TEST |
| 2026-09-02 22:17 | `55975921...` | record governance adversarial regression closure | DOC |
| 2026-09-02 22:17 | `9037966f...` | harden under-execution governance adversarial mutation | TEST |
| 2026-09-02 22:12 | `960cffde...` | sync index after CI topology reconciliation | DOC |
| 2026-09-02 22:11 | `baee2466...` | allow mandatory broad execution-enforcement governance | GOVERNANCE FIX |
| 2026-09-02 22:02 | `13dd633e...` | add explicit INDEX DRIFT contract anchor | GOVERNANCE DOC |
| 2026-09-02 22:01 | `15e6720d...` | sync master index to enforcement boundary | DOC |
| 2026-09-02 22:01 | `dd6b437e...` | enforce enforcement contract on every repository boundary | GOVERNANCE FIX |
| 2026-09-02 22:00 | `5783e7e8...` | sync master index to enforcement candidate | DOC |
| 2026-09-02 22:00 | `ec3296d9...` | compute index-only boundary from actual Git diff | GOVERNANCE FIX |
| 2026-09-02 21:59 | `c4177927...` | record execution-enforcement index-only closure | DOC |
| 2026-09-02 21:58 | `09c9b1b1...` | make index-only enforcement path proof explicit | GOVERNANCE FIX |
| 2026-09-02 21:54 | `04be92d3...` | advance index after mapped IPv6 resilience fix | DOC |
| 2026-09-02 21:54 | `1bdd5815...` | reject IPv4-mapped IPv6 private resilience targets | SECURITY FIX |
| 2026-09-02 21:51 | `6247c104...` | advance index to final verifier hardening boundary | DOC |
| 2026-09-02 21:51 | `1fb6c8d0...` | use exclusion-only pathspec for index-only proof | GOVERNANCE FIX |
| 2026-09-02 21:50 | `25a769a3...` | synchronize index after exact boundary hardening | DOC |
| 2026-09-02 21:50 | `17cff6f4...` | prove index-only boundary by excluding governed index path | GOVERNANCE FIX |
| 2026-09-02 21:49 | `208046a7...` | synchronize execution index with hardened verifier | DOC |
| 2026-09-02 21:49 | `12323951...` | harden index-only changed-file fallback | GOVERNANCE FIX |
| 2026-09-02 21:48 | `654a80f2...` | advance exact-head index after verifier fix | DOC |
| 2026-09-02 21:48 | `5ba5d835...` | derive index-only diff from exact commit tree | GOVERNANCE FIX |
| 2026-09-02 21:48 | `6e012570...` | synchronize index after enforcement gate hardening | DOC |
| 2026-09-02 21:47 | `822b1657...` | make index-only head gate deterministic | GOVERNANCE FIX |
| 2026-09-02 21:46 | `a47c24b6...` | repair exact-head index boundary after verifier rejection | DOC |
| 2026-09-02 21:43 | `fae9abad...` | synchronize exact current-head certification boundary | DOC |
| 2026-09-02 21:41 | `c5f4f6e5...` | restore code-test candidate boundary | DOC |
| 2026-09-02 21:41 | `fbc641bc...` | reconcile exact-head index after resilience CI sync | DOC |

## 6. Open PR / branch disposition

| PR | State | Assessment | Action |
|---|---|---|---|
| #308 | OPEN / DRAFT / non-mergeable | **ACTIVE CRITICAL** — autonomy runtime reconciliation, final-cert provenance, safety-chain and exact-head governance | Rebase/retarget onto the final merged baseline after #305/#307; resolve overlaps; rerun exact-head CI; do not merge as-is |
| #307 | OPEN / DRAFT / non-mergeable | **ACTIVE CRITICAL** — fixes execution-enforcement test-of-test failure on #305 candidate | Merge #305 first, then rebase/retarget #307 and rerun full required checks |
| #305 | OPEN / DRAFT / non-mergeable | **ACTIVE CRITICAL** — watched-report direct-DML boundary, terminal approval guard, file-security and security hardening | Fresh exact-head Quality currently failed on this candidate; merge only after #307/test-of-test repair is incorporated or independently repaired |
| #304 | OPEN / DRAFT / non-mergeable | **STALE / REVIEW REQUIRED** — migration-lineage restoration | Compare against current 239-file lineage before any merge; do not merge blindly |
| #303 | OPEN / non-mergeable | **LIKELY SUPERSEDED** — dashboard adapter hardening from older baseline | Compare current main before closing; do not merge old baseline wholesale |
| #302 | OPEN / DRAFT / non-mergeable | **LIKELY SUPERSEDED** — profitability RPC closure from older baseline | Current main already contains later profitability/data-truth work; verify then close/supersede |
| #301 | OPEN / non-mergeable | **LIKELY SUPERSEDED** — BI adversarial target overflow test | Verify current main contains the intended regression; close/supersede if present |
| #300 | OPEN / non-mergeable | **SUPERSEDED CANDIDATE** — broad release-hardening integration from older baseline | Do not merge wholesale; cherry-pick only any uniquely missing capability after current-main comparison |
| #294 | OPEN / non-mergeable | **SUPERSEDED CANDIDATE** — P0 integration branch from older baseline | Do not merge wholesale; current main has advanced beyond its base |
| #207 | OPEN / non-mergeable | **ACTIVE SECURITY / DESKTOP** — Electron 44.0.0 remediation | Rebase to current main, run exact-head desktop CI/evidence, then merge if clean |

## 7. Dependency-aware execution plan

### Parallel now — assistant-executable

1. Audit all remaining RPC signatures against every direct and compatibility consumer.
2. Audit all public SECURITY DEFINER functions for search path, schema qualification, EXECUTE grants, tenant/user guards, and mutation authority.
3. Audit current frontend routes for empty/loading/error/unknown/zero semantics and cross-surface data equivalence.
4. Audit import/report/export queries for pagination, deterministic ordering, count contracts and hard limits.
5. Audit worker queue state machine and watched-folder contracts for terminal resurrection, duplicate processing, fencing and retry edge cases.
6. Audit OCR/document intelligence contracts and golden fixtures; prepare the Arabic corpus execution harness.
7. Audit storage/realtime/AI-vector requirements and determine whether any capability is required for release or should be explicitly out of scope.
8. Prepare performance/scale benchmarks and EXPLAIN plans; classify the 43 unused-index INFO notices as non-blocking until workload evidence exists.
9. Prepare current-head certification manifests and evidence collectors.
10. Prepare owner handoff packets so the owner only performs the protected/interactive actions.
11. Review all open PRs for unique capabilities vs stale duplicate work; avoid wholesale old-baseline merges.

### Sequential technical chain

`#305 security/product boundary → #307 test-of-test repair → #308 autonomy/exact-head certification integration → fresh Quality → current deployment → runtime evidence`

If conflicts make this order unsafe, rebase each branch to the current main after the preceding accepted change; exact-head evidence must be regenerated after every mutation.

### Sequential operational chain

`CURRENT DEPLOYMENT → AUTHENTICATED E2E → TENANT A/B → STORAGE/REALTIME IF IN SCOPE → BACKUP → ISOLATED RESTORE → INTEGRITY/RPO/RTO → AUTHORIZED ROLLBACK → FORWARD RECOVERY → FINAL CERTIFICATION`

The protected operations are owner/device actions. The assistant must prepare all commands, checks, evidence schemas, abort criteria and expected outputs before handoff.

## 8. Owner-only minimum workload

| ID | Owner action | Exact boundary | What the owner returns |
|---|---|---|---|
| OWNER-AUTH-01 | Authenticate Tenant A and Tenant B in isolated browser sessions | Real credentials / interactive browser | Non-secret evidence IDs, timestamps, exact deployed SHA |
| OWNER-AUTH-02 | Enable leaked-password protection | Supabase Auth control plane | Enabled/non-secret state |
| OWNER-RUN-01 | Execute authenticated E2E + A/B adversarial matrix | Real browser/session | Run/evidence artifact |
| OWNER-DR-01 | Approved backup + isolated non-production restore | Protected recovery control plane | Backup ID/hash, restore ID/hash, timings, integrity, RPO/RTO |
| OWNER-DR-02 | Approved rollback + forward recovery drill | Protected deployment authorization | Deployment IDs, health, timestamps, recovery result |
| OWNER-WIN-01 | Windows native watcher smoke if CI cannot consume exact-head evidence | Local Windows filesystem | Exact SHA, logs/artifact |
| OWNER-PROD-01 | Any unavoidable protected production authorization | Production credentials/approval | Non-secret result only |

No password, token, service-role key, recovery code, or other secret should be pasted into chat.

## 9. 100% definition

The project is **100% ready** only when all of the following are simultaneously true:

- [ ] Current product/test HEAD has fresh required Quality and release checks.
- [ ] No required check is green only on an older SHA.
- [ ] Current deployed SHA is identified and runtime reachable.
- [ ] Real authenticated E2E passes at that deployed SHA.
- [ ] Tenant A/B isolation is proven live with adversarial denial and persisted evidence.
- [ ] Canonical RBAC/authority semantics are defined and proven for approval/mutation surfaces.
- [ ] Required SECURITY DEFINER EXECUTE exposure is least-privilege and justified by canonical authority.
- [ ] Import → worker → document/OCR → report/export paths are proven with representative real data.
- [ ] Arabic OCR Golden Corpus evidence is complete if Arabic document intelligence is in release scope.
- [ ] Worker crash/expiry/retry/fencing/DLQ/recovery is runtime-proven where required.
- [ ] Watched-folder to ingestion is proven on the target operating environment.
- [ ] Storage bucket contract and authenticated runtime are proven if Storage is in release scope.
- [ ] Realtime is either proven or explicitly removed from release scope.
- [ ] AI/vector retrieval is proven tenant-safe and provenance-safe if in release scope.
- [ ] Performance/scale benchmark meets defined targets with query plans and concurrency evidence.
- [ ] Backup/restore/integrity/RPO/RTO evidence exists.
- [ ] Rollback/forward recovery drill evidence exists.
- [ ] Production binding/current deployment evidence is current and exact-SHA bound.
- [ ] Final certification bundle is complete and independently consumable.
- [ ] Execution debt is zero for locally executable work.

## 10. TRUE STOP

TRUE STOP is not allowed merely because implementation is high, the current CI turns green, or the owner has been given a list. TRUE STOP is allowed only after the assistant has exhausted safe parallel repository/DB/security/evidence work, consumed asynchronous results, completed NEXT/NEXT+1/NEXT+2, run adversarial/test-of-test/regression/rescan, synchronized the current index, isolated genuine owner/external blockers, and has no remaining locally executable high-value task.
