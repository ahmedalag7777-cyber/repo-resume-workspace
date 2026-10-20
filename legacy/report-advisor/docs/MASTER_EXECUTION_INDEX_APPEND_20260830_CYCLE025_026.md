# Master Execution Index — Append-Only Cycles 025→028

## CYCLE-025 — Import NULL truth + live authenticated A/B proof
- Start HEAD: `616078dd744ed8667503bc3e884e05a0267ca55e`.
- Discovery: `public.import_jobs` allows nullable lifecycle counters while canonical and compatibility adapters converted NULL to zero and hard-coded `quarantined_rows: 0`.
- Fix merged as PR #202: nullable counters are preserved; incomplete lifecycle state fails closed with `IMPORT_STATE_INSUFFICIENT_DATA`; creation without a known total is rejected; quarantined rows are read from the source instead of fabricated.
- Exact PR head `53121b5a81f2e25344dc9a5a9711cf6f30dd48d9` passed the full quality workflow (63/63 steps) plus import lifecycle, data-quality runtime, Phase 3 import truth, integrity, security, and Windows workflows.
- Merge SHA: `4a96062b647c6afcf95f97f1af36cf22c223bd50`.
- Governed corpus created only in the two existing `RUNTIME-EVIDENCE-*` test tenants: 1 product, 1 customer, 1 invoice, 1 sale item per tenant.
- Authenticated A/B proof executed directly against Supabase by setting the governed JWT context: each test identity saw its own tenant row and zero rows from the other tenant; direct cross-tenant product INSERT was rejected by RLS.
- Receivables export cross-tenant RPC attack returned `TENANT_CONTEXT_MISMATCH`.
- Import lifecycle proof: authorized completion reached `completed/100`; repeat terminal completion returned `IMPORT_JOB_ALREADY_TERMINAL`; cross-tenant completion returned `IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN`.

## CYCLE-026 — Decision runtime authorization
- Start HEAD: `4a96062b647c6afcf95f97f1af36cf22c223bd50`.
- Discovery: stale PR #192 contained unique, still-missing runtime authorization hardening for approval/work-item execution and was not present on current main.
- Live fix applied and verified in Supabase; repository migration and dedicated executable contract added on current main.
- `decide_approval`: self-approval rejected as `SELF_APPROVAL_FORBIDDEN`; tenant derived from `current_company_id()`; authenticated-only execution; fixed search_path.
- `complete_decision_work_item`: requires approved decision + `IN_PROGRESS`; assigned items require the authenticated assignee; state-change race fails closed; authenticated-only execution.
- Live authenticated attack proof executed: self-approval → `SELF_APPROVAL_FORBIDDEN`; wrong assignee → `WORK_ITEM_ASSIGNEE_FORBIDDEN`; non-IN_PROGRESS → `WORK_ITEM_NOT_IN_PROGRESS`.
- Dedicated continuous workflow added: `.github/workflows/decision-runtime-authorization.yml`.

## CYCLE-027 — Local Ollama capability + release-integrity evidence
- Exact implementation HEAD: `926f5577f53e3c3a04941c14d1994d7ae21c3d7a`.
- Change: `chore(ai): permit optional local Ollama runtime`.
- Ollama is treated as an optional local capability rather than a mandatory paid/provider dependency.
- Exact-head Quality workflow passed; Windows workflow passed on the same implementation candidate.
- Decision-runtime hardening provenance was independently traced to canonical repository migration source rather than copied blindly from live Production.
- Migration parity remains an explicit unresolved release-integrity track; no fabricated migration or unsafe Production mutation is permitted.

## CYCLE-028 — Migration provenance reconciliation closure
- Production migration inventory was re-read directly from Supabase and includes the late-cycle entries for Data Quality truth, Receivables tenant authority, Import Finish terminal lifecycle, and Decision Runtime authorization.
- Canonical repository provenance was verified for all four logical hardening tracks.
- Receivables canonical migration: `supabase/migrations/20260830202000_harden_receivables_export_tenant_authority.sql`.
- Decision Runtime canonical migration: `supabase/migrations/20260830202600_harden_decision_runtime_authorization.sql`.
- Import Finish canonical migration: `supabase/migrations/20260830210000_harden_import_finish_lifecycle.sql`; the canonical artifact is intentionally distinct from the Production migration identifier `20260830201301`.
- Data Quality canonical change is represented by the current-main `supabase/migrations/20260830240000_fix_empty_quality_truth.sql` lineage rather than treating the Production migration identifier as a required filename match.
- PR #198 is merged (`9e21a5bf5ba84966509a17804048899e88276173`) and documents the Import Finish terminal lifecycle security/correctness closure.
- Exact SQL for the canonical Import Finish migration was independently read from `main`; it enforces caller tenant authority, terminal-state allow-list, terminal-job non-resurrection, `SECURITY INVOKER`, fixed `search_path`, and authenticated-only execution.
- Reconciliation conclusion: logical provenance for the four late-cycle hardening tracks is **resolved**; exact migration-version equality between live `schema_migrations` identifiers and repository filenames is **not** required when a canonical replacement/lineage is proven.
- No Production DDL mutation was performed during this cycle.
- No certification claim is promoted from this evidence alone; final release still requires exact-candidate deployment binding, authenticated E2E, restore/RPO/RTO, Windows/native lifecycle proof, and final certification evidence.

## Current truth boundary
- These cycles add real repository code, live staging controls, governed test data, and authenticated adversarial evidence.
- Ollama local capability is implemented and CI-validated.
- The four late-cycle migration hardening tracks now have repository provenance; the remaining release gate is replay/rebuild equivalence and final operational certification, not blind filename matching.
- Production certification remains **NO** until deployment binding, restore/RPO/RTO, Windows/native lifecycle, authenticated E2E vertical journey, migration replay/reconciliation, and final release evidence requirements are satisfied on the final exact production candidate.
- This index is append-only in intent: historical cycle evidence is preserved; this update records the next cycle without rewriting prior claims.
