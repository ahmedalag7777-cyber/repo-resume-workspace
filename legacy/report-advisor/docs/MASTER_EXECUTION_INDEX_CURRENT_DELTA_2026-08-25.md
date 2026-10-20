# Master Execution Index — Current Delta — 2026-08-25

Append-only supplement to `docs/MASTER_EXECUTION_INDEX.md`.

## Verified discoveries
- Canonical TypeScript file engine already implements schema discovery, header detection, semantic mapping, Arabic/Latin business-key entity resolution and reconciliation.
- Existing layout/table fidelity tests detect table/row loss and fallback.
- Watched reports, business control plane and K runtime contracts already exist.
- Recent Quality/runtime failures had `steps:null`; no application root cause is asserted without executable steps.
- The same pre-step failure pattern is reproducible across the canonical `quality` run, the `runner-diagnostic` run, and the re-run attempt: jobs complete as failure with zero reported steps and job logs are unavailable (`BlobNotFound`). This is now classified as runner/bootstrap evidence, not an application defect.
- Resumable execution is already implemented and hardened: checkpoint state machine, lease lifecycle, queue idempotency, retry and dead-letter semantics have dedicated fixes and regression/closure gates (`eb877c8`, `a822fdf`, `640052df`, `25ba6e9`, `28cc790`). Do not rebuild this subsystem; audit integration/evidence instead.
- K→S runtime already has canonical portfolio/checkpoint alignment and a durable lifecycle runner (`91f1497`, `3a00546`).
- Production certification is already heavily implemented: certification policy, rollback assurance, certification bundle, chain/boundary guards and CI workflows exist (`f2859b6`, `73e10f`, `93386c2`, `d18e327`, `35e9dbb`, `de906dd`). Do not create another certification framework; the remaining gap is executable/live evidence and consolidation.

## Deep inventory discoveries — 2026-08-25
- Current recursive repository tree confirms the canonical UI/application surface is under `src/` with `App.tsx`, `main.tsx`, `components/`, `pages/`, `lib/`, and `index.css`; do not assume an absent frontend layer.
- The repository currently has a dedicated `services/document-intelligence/` service and `supabase/migrations/`; database/service layers therefore exist as first-class source surfaces and must be audited alongside `src/` and `scripts/`.
- The current tree contains 23 workflow files. `quality.yml` is the automatic canonical path; specialized production/recovery/runtime workflows remain separate and should not be duplicated without a proven coverage gap.
- `quality.yml` currently wires Core contracts, production certification, operational resilience, continuous trust, autonomy governance, watched reports, K/L/M, production blockers, A0 hardening, typecheck, regressions, tenant/security, lint/build, intelligence/scale, analysis runtime, document intelligence service tests, report truth/readiness and full document resilience. This substantially reduces the set of missing static gates; future work should prioritize integration/live evidence rather than adding more broad gates.
- `package.json` is an unusually dense execution registry: it already covers A0–M, K→S, production certification/readiness/blockers, file/schema/entity/reconciliation, Onyx/import, analysis cache/concurrency, inventory/demand/decision intelligence, tenant/RLS, document intelligence, adversarial/golden/evidence/provenance/regression/performance suites. Never infer a missing test from a missing filename until the package registry and referenced script are checked.
- `scripts/` already contains adversarial document corpus tests, canonical-text provenance tests, release-manifest tooling and a large family of `check-*` contracts. This is evidence that several previously listed P1 items may be partially implemented and require capability/evidence mapping rather than greenfield construction.
- The current `quality.yml` explicitly executes Python service tests with `python3 -m unittest discover -s services/document-intelligence/tests -p 'test_*.py'`, so Document Intelligence service tests are part of the canonical quality definition even though current GitHub runtime evidence has not reached executable steps.
- `supabase/migrations/` exists as the database schema source. Migration safety/drift must therefore be evaluated from actual migration history and release gates, not treated as a missing database layer.
- The canonical tenant migration is already strong: authenticated membership resolution is fail-closed, anonymous access is revoked for File Intelligence surfaces, tenant-scoped RLS policies are installed, and normalized SKU uniqueness is enforced per company. Do not replace this with a second tenant model.
- The core schema confirms `sale_items` is scoped through `sales_invoices`, not by its own `company_id`; any query-level tenant hardening must respect the actual relational schema.
- `src/lib/supabase.ts` still exposes a legacy static `COMPANY_ID` plus mutable `activeCompanyId`. This is now a verified integration-review item: tenant-aware UI/query flows must converge on the canonical authenticated resolver rather than assuming the static demo company.
- `src/lib/queries.ts` had several truth/integrity weaknesses: dashboard queries ignored Supabase errors, empty invoice sets could issue unnecessary child queries, dashboard status could claim `CALCULATED` despite no usable data, monthly trend fetched all sale items instead of only the selected company's invoices, and top-product aggregation had no explicit parent-invoice tenant scope. These were corrected without inventing a new data model, but the query layer still imports the static `COMPANY_ID`, so tenant convergence is not complete.

## Audit correction — authoritative inventory baseline
- Earlier notes used “full inventory” too early. Those audits were deep but subsystem-oriented, not a literal repository-wide semantic review. This is now explicitly corrected; the project must not treat those earlier claims as proof that every source surface was already known.
- Added `docs/MASTER_SYSTEM_INVENTORY_2026-08-25.md` as the structural inventory baseline. It records verified repository surfaces, current technology truth, CI truth, existing application capabilities, integration-review surfaces, audit rules and the next exhaustive semantic audit order.
- Added `scripts/build-system-inventory.mjs` as a reproducible repository scanner and registered `npm run inventory:system`. It generates machine-readable and Markdown structural inventory artifacts from the checked-out repository. This is now the mechanism for preventing future “we did not know this existed” gaps.
- **New verified toolchain fact:** the checked-in `main` `package.json` currently declares React `18.3.1`, React DOM `18.3.1`, Vite `5.4.2`, TypeScript `5.5.3`, Tailwind `3.4.1`, Supabase JS `2.57.4`, pdfjs-dist `6.2.108`, Tesseract.js `7.0.0` and xlsx `0.18.5`. Earlier assumptions about React 19/Vite 7 are not current repository truth and must not drive implementation until lockfile/source verification proves otherwise.
- `package-lock.json` is present with lockfileVersion 3 and agrees with the major React/Vite/TypeScript versions declared by `package.json`; minor/patch dependency ranges are resolved in the lockfile and should be treated as the reproducible install source.
- `tsconfig.app.json` is strict, uses ES2022/bundler resolution, path alias `@/* → src/*`, and includes only `src`. `vite.config.ts` defines the React plugin, the same `@` alias, dependency optimization exclusion for `lucide-react`, and explicit vendor chunks for React/charts/xlsx.
- `eslint.config.js` uses ESLint 9 + typescript-eslint recommended rules and keeps several legacy hygiene findings as warnings. This is a deliberate migration posture, not an absent lint layer.
- **Critical new frontend/auth finding:** `src/App.tsx` mounts all application routes directly under `BrowserRouter` and does not show an authentication boundary. A repository search for `supabase.auth.` returned no matches. `src/lib/supabase.ts` creates the client with `persistSession: false` and still exposes a static demo `COMPANY_ID`. This is now a P0 security/runtime integration audit item: before production certification, authenticated tenant resolution and route/session protection must be proven end-to-end. No destructive change has been made yet because the inventory-first phase is still running.
- `src/App.tsx` exposes the critical product surface through routes for dashboard, command center, import, data quality, reports, inventory intelligence, demand velocity, receivables, profitability, analytics/RFM/ABC/aging, intelligence/recommendations/forecasts/scenarios, customers/products/inventory, alternative groups and settings. These routes now form the authoritative frontend critical-flow inventory for AUDIT-4.
- `ImportPage.tsx` is a thin composition of `CanonicalImportPage` plus `FolderBatchImportPanel`; the canonical import page is therefore reachable even though it is not a separate route.
- `Sidebar.tsx` hardcodes the visible identity as `المدير العام / admin@alamri.com`. This is another P0 identity-integrity finding: production UI identity must come from the authenticated session/profile, not hardcoded demo metadata.
- `Header.tsx` hardcodes the status text `النظام يعمل` without evidence. This is a P1 truthfulness/observability finding: production status indicators must reflect a real health source or clearly be presentation-only.
- The root repository also contains `fixtures/`, `index.html`, `eslint.config.js`, `postcss.config.js`, `package-lock.json`, `package.json`, `scripts/`, `services/`, `src/`, `.github/`, `.bolt/`, `docs/`, and the execution/README files. These surfaces must be included in future inventory passes.
- The root `package.json` is named `vite-react-typescript-starter`; this is a metadata/branding audit item, not evidence that the application architecture is a starter. Do not rename blindly until deployment/build references are mapped.

## Repairs
- `production-integrity-wave-v2.yml`: manual-only + Ubuntu 22.04. Commit `f170c13974c86ad1432af16bd75a87455bcf5749`.
- `report-execution-gate.yml`: manual-only + Ubuntu 22.04. Commit `500d0a877da5d9aa89f5658ad96d752d8eca7688`.
- `runtime-closure-wave.yml`: manual-only + Ubuntu 22.04. Commit `44ed31658f05296055a89d8ca0af028e69d60f7d`.
- `quality.yml`: canonical automatic path pinned to Ubuntu 22.04. Commit `653a7825393c8a8069430ceb52c71083bb60a6b4`.
- `scripts/check-cross-surface-traceability.mjs`: new critical capability traceability checker. Commit `10b82f17ed787bc0958ea3e9f643fcab62b09b9e`.
- `quality.yml`: wired cross-surface traceability immediately after CI/release topology checks. Commit `8c8a761a56eceface91695a023fad025f05b7c4f`.
- `src/lib/queries.ts`: dashboard fail-closed error handling, empty-child-query guard, truth-preserving status, tenant-scoped monthly child reads, and parent-invoice-scoped top-product aggregation. Commits `7a5270a18d6fb0943b10bc132ba8040f8fb45f91` and corrective `e1bfbc1dbf46985b6287771ce9448c13285c7341`.
- `scripts/build-system-inventory.mjs`: reproducible whole-repository structural inventory generator. Commit `6037cdf4d875819145d6c56ce5ed389218f5e456`.
- `package.json`: registered `inventory:system`. Commit `f3223c8c5ce002cbfe21a8c5589f4e9d64a59cd3`.
- `docs/MASTER_SYSTEM_INVENTORY_2026-08-25.md`: authoritative structural inventory baseline and audit correction. Commit `9ebcbc6fa3a08cc03d383e33bf900237622971bb`.
- Batch audit ledger: `docs/EXECUTION_LEDGER_2026-08-25_BATCH-3.md`, commit `d56da91e6a7026b207b0b75d14a64b0b8afd0320`.

## Current runtime evidence
- Quality run `32791765387`: failed; job `verify` ended with `steps:null`.
- Runner diagnostic run `32791765423`: failed; job `probe` ended with `steps:null`.
- A targeted re-run of the Quality job was performed. The resulting job `97635233280` again ended with failure and `steps:[]`; logs remain unavailable (`BlobNotFound`).
- A targeted inspection of the runner diagnostic job also returned `steps:[]` and unavailable logs.
- Therefore no TypeScript/Python/SQL/package command has been observed executing in these attempts. Do not alter application logic to compensate for this evidence.

## Current truth
Document Intelligence, schema/entity/reconciliation, watched reports, business control plane and K are IMPLEMENTED/GATED. Resumability/dead-letter and production certification frameworks are also IMPLEMENTED/GATED. Live production certification remains incomplete because executable runtime evidence has not yet been obtained. Frontend authentication/tenant session convergence is now an explicit P0 review item and is not marked complete.

## Current priority order
1. Complete the machine-generated repository inventory baseline and keep it current before each major execution wave.
2. Complete the toolchain/lockfile/config compatibility audit.
3. Treat authentication/session/tenant route protection as P0 and trace it end-to-end before production certification.
4. Complete `package.json script → script file → workflow → runtime evidence` mapping for all P0/P1 capabilities.
5. Complete migration dependency/order/RLS/index mapping from the actual migration history; do not infer deployment state from filenames.
6. Trace critical UI flows from `App.tsx → pages → components → lib/services → database` and fix dead ends only where proven.
7. Use existing manual specialist workflows for Document Intelligence and J/K/L as soon as workflow dispatch is available, and record real executable evidence.
8. Audit existing resumability/dead-letter and certification integration/evidence rather than rebuilding them.
9. Advance E/F/H/I live security/resilience/governance evidence in parallel.
10. Do not mark M or Production Certification complete until executable runtime evidence exists.

## Reclassified work after deep inventory
- Document Intelligence internal architecture is no longer treated as a broad greenfield gap. Existing service, pipeline/contracts, intermediate model, adversarial corpus, layout/table fidelity, extraction-quality, provenance, fallback, golden E2E and resilience suites are present. Remaining work is now specifically: capability-to-requirement traceability, missing edge-case coverage, live execution evidence, and any proven implementation gaps discovered by those tests.
- Resumability/dead-letter is no longer a build backlog item. It is an integration/evidence item.
- Production certification is no longer a framework build item. It is a live evidence/consolidation item.
- The next high-value static audit target is the relationship among `package.json` scripts, `quality.yml` steps, `scripts/check-*`, service tests, migrations and UI/runtime entry points. Any item present in one layer but absent in the others is a candidate integration gap.
- A first cross-surface traceability guard now exists for Document Intelligence, watched reports, Business Control Plane, K/L runtime, production certification, tenant security and release resilience. This is deliberately narrow and auditable; it is not a replacement for runtime evidence.
- Dashboard query truth and tenant scope are now hardened at the query boundary without assuming `sale_items.company_id`; the next integration target is the static company context and its relationship to authenticated tenant membership.
- Authentication/session protection is now explicitly classified as a P0 gap until the frontend has a real authenticated boundary and the Supabase session/tenant context is reconciled with the canonical membership resolver.
- Hardcoded user identity and hardcoded “system healthy” presentation are now explicit UI integrity findings and must be resolved before production certification.

## Next execution — authoritative inventory program
### AUDIT-1 — Toolchain truth
**Partially completed:** `package.json`, `package-lock.json`, `tsconfig.app.json`, `vite.config.ts` and `eslint.config.js` were inspected. Major versions are internally consistent (React 18/Vite 5/TS 5). Remaining: inspect all environment/deployment/build configuration and verify Node version assumptions against workflows before upgrades.

### AUDIT-2 — Complete execution mapping
For every P0/P1 package script, verify the referenced file exists, the command is reachable, and the relevant workflow/manual gate invokes it. Then classify: implemented/static, executable, runtime-evidenced, production-certified.

### AUDIT-3 — Database/migration closure
Enumerate every migration and map tables, functions, indexes, policies, triggers and dependencies to requirements and consumers. Detect duplicate/ordering/drift hazards only when proven.

### AUDIT-4 — Frontend critical-flow closure
Trace upload/import, document review, report execution, decision intelligence, inventory/demand, evidence and certification from route/UI through lib/services to database. **First P0 subtask: authentication/session/tenant boundary.**

### AUDIT-5 — Service boundary closure
Map every Document Intelligence provider, parser/OCR/table path, intermediate model, provenance path, quarantine/reprocess path and frontend integration. Add only missing evidence/cases.

### AUDIT-6 — J/K/L/M connected runtime
Trace durable job → checkpoint → business snapshot → evidence → decision → outcome → certification using the existing implementations.

### AUDIT-7 — E/F/H/I live evidence
Execute tenant, storage, realtime, AI retrieval, backup/restore, worker recovery, SLO, rollback and governance canaries when the runtime environment is available.

### AUDIT-8 — CI runtime recovery
Continue isolating the pre-step GitHub failure. Do not attribute it to application code until a workflow reaches an executable step and produces logs.

### AUDIT-9 — Production certification
Only after live evidence closes all P0 blockers and the authoritative release/certification chain produces current evidence.

## Non-negotiable audit rule
No future statement may say “the whole project is known” based only on workflow/package/filename inspection. The project is considered understood only after the system inventory, capability mapping, implementation review and evidence matrix agree. Any newly discovered existing capability must be reclassified in the index before new implementation is started.

## Next
The next execution wave continues inventory-first: finish AUDIT-1 environment/deployment truth, then AUDIT-2 execution mapping and AUDIT-4 authentication/tenant boundary, while AUDIT-3 migration mapping proceeds in parallel. **Know the system, record the system, then complete the proven gaps.**
