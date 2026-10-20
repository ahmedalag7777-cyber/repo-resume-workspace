# Execution Report — 2026-10-11 — Visible Passport + Source-safe Logical Restore

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR: [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912) — OPEN / NOT MERGED.
- Exact application/test head: [`023d8d38d0c05e6b62c872b234422f9d717e2727`](https://github.com/Report-Engainall/Report-Advisor/commit/023d8d38d0c05e6b62c872b234422f9d717e2727).
- Product completion: **NO**.

## What changed
1. Added a visible `EVIDENCE PASSPORT` chip to the shared `ReportIntelligencePanel`, next to `GUIDANCE`, so the source-bound Trust screen and other views expose the same visible label.
2. Fixed Phase-F logical restore by querying actual UUID foreign-key references to `auth.users` from public tables, then inserting id-only placeholders into the disposable local target before restoring the public data dump. SQL explicitly avoids auth triggers with session-local replication role; stub writes are idempotent; temporary stub SQL file is mode 0600 and removed with the ephemeral work directory.
3. Kept public business data intact. The only data exclusions remain the operational health snapshots and volatile carts/cart_items session state. Company memberships, orders, invoices, payments and evidence/decision tables are not excluded.
4. Added static regression checks for discovery, ID-only fields, idempotent insert, application order, and the visible passport label.

## Predecessor failures and evidence
- [Full Product Browser E2E run 38155955866](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38155955866) proved auth and tenant/source binding, 254 source/canonical rows, Smart Report refresh/readback, and Reports Center lineage; it terminated FAIL because the Trust screen lacked visible `EVIDENCE PASSPORT`. That test was not a full journey PASS.
- [Phase-F live resilience run 38156050104](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38156050104) passed operational health, tenant canary and rollback/forward drill, then failed logical restore with `company_memberships_user_id_fkey` because the public-only dump contains references to Auth IDs absent from the target.
- The ID-only Auth repair is intended to resolve all single-column UUID public FKs to Auth without copying identities or credentials; it is not proven until the new restore completes and public table counts/constraints match.

## Current exact-head validation
Fresh runs queued/pending for `023d8d38d0c05e6b62c872b234422f9d717e2727`:
- [Build Gate 38157202890](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38157202890)
- [Quality 38157202815](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38157202815)
- [Session Handoff 38157202962](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38157202962)
- [Final Certification 38157202927](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38157202927)
- [Full Product Browser E2E 38157202976](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38157202976)
- [Phase-F live resilience 38157202966](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38157202966)

No queued result is reported as PASS. The Netlify preview had previously been verified only at source SHA `eaebe8ccaaacf17846ceb070c33229cd7d1e3b48`, not this application head. Production-current, complete authenticated upload/save/readback/refresh, and real-source 48-archetype proof remain NOT_PROVEN.

**NEXT EXACT ACTION:** Read exact-head Phase-F and Full Product Browser E2E terminal evidence first. If restore passes, verify the public count and FK parity; verify the new visible Trust label and fresh upload-to-refresh journey with unchanged reportJobId and SHA-256; fix the first remaining terminal failure.
