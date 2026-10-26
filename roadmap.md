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
- [x] User priority: finish the application according to the attached executive message first; defer GitHub delivery.
- [ ] Send all application work to GitHub after application work — deferred by user; requires owner-controlled Git sync.

- [ ] P0-A: Inventory current tooling vs required capabilities; reconciliation matrix (KEEP/EXTEND/INTEGRATE/REJECT/DEFER per capability)
- [ ] Resume 2026-10-25: finish browser PDF/DOCX/OCR adapters, extraction review and table selection, precise arithmetic, free runtime guard, operational tests and acceptance evidence
- [ ] P0-B: Integrate chosen foundation tools into the real pipeline (PDF text extraction, OCR fallback path decision, table structure, financial calc precision, data quality, semantic column dictionary, unified free-AI provider layer with paid paths blocked) + smoke tests
- [ ] Acceptance gate: documented proof — tools kept/added/rejected with licenses, real wiring paths, real run tests, one end-to-end file→extract→verify→analyze path, zero-spend proof
- [ ] P1: semantic column engine + relationship/formula inference on top of accepted tools
- [ ] Then resume: port Report-Advisor screens, admin panel, inner-page redesign, outcome capture (deferred by the order)
