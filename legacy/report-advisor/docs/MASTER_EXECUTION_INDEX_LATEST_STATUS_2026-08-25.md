# Master Execution Index — Latest Status — 2026-08-25

This is the authoritative compact execution snapshot. Repository source, executable CI/runtime evidence, and certification artifacts are authoritative; conversation history is not evidence.

## Evidence vocabulary
`UNKNOWN → INVENTORIED → IMPLEMENTED → GATED → INTEGRATED → RUNTIME-EVIDENCED → PRODUCTION-CERTIFIED`; use `BLOCKED` only for an external prerequisite.

## Current indexed head
The proactive closure sequence now includes workflow-batch integrity and import-lifecycle guards in addition to tenant/import/reconciliation hardening.

Latest implementation commits in this execution wave:
- `e191873d` — adds a dedicated parallel `batch-integrity-guards` workflow.
- `68f43a44` — wires workflow-batch and import-state guards into package scripts.
- `2923c326` — hardens workflow integrity checks without prohibiting legitimate cancellation in unrelated workflows; quality.yml remains fail-closed.
- `07580013` — adds the import lifecycle contract guard.
- `f884a62e` — initial workflow batch integrity guard.

Earlier verified closure work remains part of this state: authoritative tenant filters, tenant-authoritative duplicate lookup, folder duplicate lookup, deleted-row reconciliation, authoritative KPI tenant resolution, evidence-bound decisions, fail-closed batch decisions, atomic import chunks, terminal failed-import state, report retry/recovery hardening, and K/L integration contracts.

## Capability matrix
| Capability | Implementation | Gate | Integration | Runtime | Production |
|---|---|---|---|---|---|
| File/schema intelligence | YES | YES | PARTIAL/REVIEW | NOT PROVEN | NO |
| Entity/reconciliation | HARDENED | YES | INTEGRATED/REVIEW | NOT PROVEN | NO |
| Deleted-row reconciliation | IMPLEMENTED | YES | PENDING NEW CI | NOT PROVEN | NO |
| Document Intelligence | YES | YES | PARTIAL | NOT PROVEN | NO |
| Watched reports | YES | YES | YES/REVIEW | NOT PROVEN | NO |
| Business Control Plane | YES | YES | YES/REVIEW | NOT PROVEN | NO |
| K production intelligence | YES | YES | YES/REVIEW | NOT PROVEN | NO |
| L resumable execution | YES | YES | YES/REVIEW | RETRY RECOVERY IMPLEMENTED / LIVE NOT PROVEN | NO |
| Dead-letter/retry/checkpoint | YES | YES | YES/REVIEW | FAILURE→RETRY→DEAD-LETTER IMPLEMENTED / LIVE NOT PROVEN | NO |
| DB tenant membership/RLS | YES | YES | YES at DB boundary | LIVE PROOF REQUIRED | NO |
| Frontend auth/session | YES | YES | YES | NOT PROVEN | NO |
| Canonical tenant hydration | YES | YES | YES | NOT PROVEN | NO |
| Legacy application tenant consumer boundary | HARDENED | YES | PENDING NEW CI | NOT PROVEN | NO |
| KPI/decision missing-data fail-closed | HARDENED | YES | PENDING NEW CI | NOT PROVEN | NO |
| Batch decision invalid-input guard | HARDENED | YES | PENDING NEW CI | NOT PROVEN | NO |
| Atomic import chunks | IMPLEMENTED | YES | PENDING NEW CI | NOT PROVEN | NO |
| Duplicate import tenant authority | IMPLEMENTED | YES | PENDING NEW CI | NOT PROVEN | NO |
| Failed import terminal-state persistence | IMPLEMENTED | YES | PENDING NEW CI | NOT PROVEN | NO |
| Import lineage/idempotency | IMPLEMENTED | REVIEW | REVIEW | NOT PROVEN | NO |
| Onyx reconciliation | IMPLEMENTED/REVIEW | YES | REVIEW | LIVE REQUIRED | NO |
| Workflow batch integrity | IMPLEMENTED | NEW GUARD | PENDING RUN | NOT PROVEN | NO |
| Import lifecycle contract guard | IMPLEMENTED | NEW GUARD | PENDING RUN | NOT PROVEN | NO |
| CI runner execution | IMPLEMENTED | YES | NEW RUN REQUIRED | NOT PROVEN | NO |

## Tenant canonical rules
- Effective tenant is database-authoritative through `current_company_id()`.
- No static tenant UUID, mutable `COMPANY_ID`, old tenant membership table, or client-selected tenant may become security authority.
- A client-side `company_id` filter is permitted only as defense-in-depth when its value is freshly resolved from `resolveCurrentCompanyId()`; RLS/RPC remains authoritative.
- Duplicate-file lookup resolves the tenant internally; legacy caller parameters cannot select a tenant.

## Data/import closure
- Full-chunk validation precedes persistence.
- Canonical import writes through the existing atomic RPC wrapper.
- Commit count and returned IDs are reconciled before a chunk is considered successful.
- Failed jobs become terminal with structured error/progress evidence.
- Duplicate file detection is tenant-authoritative and hash-based.
- Reconciliation reports target-only keys as `deletedKeys`; this is observation only and never performs implicit deletion.
- Business-key normalization and order-independent fingerprints remain enforced.
- Import lifecycle guard requires canonical terminal-state and tenant-authority contracts to remain present.

## Workflow closure
- Quality workflow keeps `cancel-in-progress: false` and includes `github.run_id` in concurrency identity.
- No workflow may silently use `continue-on-error: true`.
- Dedicated batch-integrity workflow runs independently on push/PR/manual dispatch.
- Independent guard workflow is intentionally additive; it does not replace the main Quality workflow.

## Truth/KPI rules
- Missing/invalid business data must not silently become zero.
- KPI/decision paths fail closed when required inputs are absent or invalid.
- Executive metric tenant input is checked against database authority.
- Decisions require evidence IDs; empty evidence cannot silently pass through the decision pipeline.

## LIVE REQUIRED
The following cannot be honestly promoted from implementation to runtime/production certification without a real connected environment:
- Supabase authenticated multi-tenant adversarial proof.
- Storage cross-tenant isolation.
- Realtime channel isolation.
- AI/vector namespace isolation.
- Real worker lease/heartbeat race and failure injection.
- Production backup/restore and rollback proof.
- End-to-end K/L coordinator execution with durable runtime evidence.
- Native Windows/Android/iOS watcher execution on target platforms.

## Prohibited shortcuts
No mocked business data, fake runtime evidence, fabricated defaults, `any` in newly hardened core code, parallel engines, or status inflation from commits/files.
