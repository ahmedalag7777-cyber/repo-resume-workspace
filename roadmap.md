# Roadmap — Unified Report Advisor

## Done
- [x] Base app from report-insight-engine (latest snapshot): universal engine, report-intelligence (48 archetypes), file-engine, decision-intelligence, routes /, /auth, /analyze, /analyses/$id, /tasks
- [x] Report-Advisor latest snapshot kept in legacy/report-advisor (verified identical to GitHub HEAD) for porting
- [x] Cloud tables analyses, decisions, work_tasks, mapping_feedback, user_roles (first user = admin)
- [x] Sign-up with instant access (no approval/confirmation), Google + Lovable sign-in
- [x] New premium visual system, home + auth redesign, shared header
- [x] Verified: sign-up → upload fixture → analysis saved and displayed

## Executive order (P0, 2026-10-24): Tooling-first before features
Per أمر تنفيذي عاجل + Supplement V6: freeze feature work; INSPECT → RECONCILE → foundation tools → integrate+test → acceptance gate → then resume features. Budget $0, no paid paths, no silent paid fallback.

## Delivery order (2026-10-26)
- [x] Reattached executive message read; source audit and independent totals integrated and displayed; V6 reconciliation documented in docs/REQUIREMENTS_MATRIX.md without repeating engines.
- [x] User priority: finish the application according to the attached executive message first; defer GitHub delivery.
- [ ] Send all application work to GitHub after application work — deferred by user; requires owner-controlled Git sync.

- [x] P0-A: Inventory and reconciliation — docs/TOOLING_REGISTRY.md documents tools, versions, licenses, wiring and deferred limits.
- [x] Browser PDF/DOCX/OCR adapters, extraction review and table selection, decimal sum, free runtime guard; 22 unit tests.
- [x] P0-B implemented scope: 4 document paths tested in signed-in UI through saved results; inherited quality/dictionary retained; paid and unconfigured external inference blocked.
- [x] Scoped acceptance evidence: docs/TOOLING_ACCEPTANCE.md; not a full application/V6 PASS. Scanned PDF compatibility fixed and tested.
- [ ] Full document acceptance: authentic user workbook/Arabic complex scans and OCR data-license review required; reattached executive message is available and understood.
- [ ] Advanced document foundations: formula recalculation, layout-preserving conversion, local model runtime — no compatible configured free runtime; explicitly deferred, not claimed complete.
- [ ] P1: semantic column engine + relationship/formula inference on top of accepted tools
- [ ] Then resume: port Report-Advisor screens, admin panel, inner-page redesign, outcome capture (deferred by the order)
