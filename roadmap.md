# Roadmap — Report Advisor (checkpoint)

## Done (session 1)
- [x] Imported Report-Advisor engines verbatim: src/lib/report-intelligence (48 archetypes = accelerators), file-engine/normalizer, decision-intelligence; fixtures/realistic-reports
- [x] Lovable Cloud: tables analyses, work_tasks, decisions, mapping_feedback (RLS per user); email + Google sign-in enabled
- [x] Universal engine src/lib/universal: parse (CSV/XLSX/JSON, Arabic digits, header detection, total-row removal) → profile/semantic map → 32 capabilities with status/why/inputs/evidence/provenance → insights (WHAT/WHY/SO WHAT/IMPACT/NEXT/PROOF) → role tasks
- [x] Test on unknown-type real report (src/test/universal-pipeline.test.ts) passing

## Done (session 2)
- [x] Full archive of original repo (commit b4bb9fe) in legacy/report-advisor: src, docs, scripts, services, tests, fixtures, db-migrations-reference, config-reference (outside build; port pieces into src/ as needed)

## Next (resume here)
- [ ] Arabic RTL UI: landing, /auth, /analyze upload, /analyses/$id (overview, capability matrix, insights, forecast+what-if, tasks, decisions, data/mapping), /tasks daily board
- [ ] Persist + read back (analyses/tasks/decisions/mapping_feedback) and browser-prove with Playwright
- [ ] Outcome capture on tasks → learning; decision replay across same signature
- [ ] Review uploaded import-manifest.csv / capability-verification.csv and write updated copies to docs/
- [ ] docs/DEPENDENCIES.md (xlsx 0.20.3 Apache-2.0 free, papaparse MIT free; both client-side, no paid service)
- [ ] Port further keep-listed modules (import-pipeline, free-toolbox decision-*) as needed
