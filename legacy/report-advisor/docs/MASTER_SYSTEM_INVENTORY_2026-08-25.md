# Master System Inventory — 2026-08-25

## Purpose
This is the structural inventory baseline for Report-Advisor. It exists to prevent future work from relying on memory or on a partial subsystem audit.

## Important correction
Earlier execution notes used phrases such as “full inventory” too early. Those audits were deep but layered, not a literal repository-wide inventory of every source surface. This document deliberately corrects that status. A capability is not considered fully understood until its requirement, implementation, execution command, workflow, dependencies, persistence/schema, UI entry point where applicable, and evidence path have been mapped.

## Verified repository surfaces
- Root project: Vite + React + TypeScript application.
- `src/`: canonical frontend/application surface with `App.tsx`, `main.tsx`, `components/`, `pages/`, `lib/`, styles and Vite typing.
- `.github/workflows/`: 23 workflow files currently present in the recursive tree; `quality.yml` is the canonical automatic path and specialist workflows are intentionally separate.
- `scripts/`: large contract/check/test surface including file intelligence, document intelligence, imports, analytics, decision intelligence, K/L/M, production certification, release/resilience and security.
- `services/document-intelligence/`: dedicated Python service with `app/`, `tests/`, `requirements.txt`, and README.
- `supabase/migrations/`: first-class database schema/evolution source containing core, file intelligence, import engine, executive metrics, inventory/demand, alternative items, security hardening, anonymous lockdown, canonical tenant membership and import lineage/idempotency migrations among the verified files.
- `docs/`: requirements, architecture, accuracy, execution ledgers, CI diagnostics and master execution references.
- `package.json`: dense execution registry covering application build/typecheck/lint plus A0–M, K→S, production certification, file/schema/entity/reconciliation, imports/Onyx, analysis, inventory/demand/decision intelligence, tenant/RLS and document intelligence suites.

## Current technology truth
The current `package.json` on `main` declares React 18.3.1, React DOM 18.3.1, Vite 5.4.2, TypeScript 5.5.3, Tailwind 3.4.1, Supabase JS 2.57.4, pdfjs-dist 6.2.108, Tesseract.js 7.0.0 and xlsx 0.18.5. Any earlier assumption that the checked-in main branch is already on React 19/Vite 7 is not accepted as current truth until verified from the repository. This is now a dedicated compatibility/version-audit item.

## CI truth
- 23 workflow files are present in the current recursive tree.
- `quality.yml` is the canonical automatic workflow and contains broad wiring for core contracts, production certification/readiness, resilience/trust/governance, watched reports, K/L/M, security/tenant, file/document intelligence, analysis, report truth and build/typecheck/lint.
- Several specialist workflows were intentionally changed to manual-only to reduce duplicate execution. They remain evidence paths, not canonical push gates.
- Current GitHub failures previously observed at `steps:null`/`steps:[]` with unavailable logs remain classified as runner/bootstrap evidence until an executable step is observed.

## Application truth already verified
- File/schema intelligence, header detection, semantic mapping, Arabic/Latin business-key resolution and reconciliation are implemented.
- Document Intelligence has contracts, intermediate model, provenance, pipeline boundaries, adversarial/golden/resilience tests and closure gates.
- Watched reports and Business Control Plane exist.
- K production intelligence and K→S durable lifecycle infrastructure exist.
- Resumable execution, leases, queue idempotency, retries and dead-letter semantics exist and have dedicated closure/regression work.
- Production certification, rollback assurance, release evidence and chain/boundary guards exist; live production certification remains evidence-gated.
- Tenant membership/RLS and anonymous File Intelligence lockdown exist in migrations.
- Dashboard query truth/tenant scoping was recently hardened without assuming `sale_items.company_id`; `sale_items` is scoped through `sales_invoices` in the verified schema.

## Known integration-review surfaces
1. `src/lib/supabase.ts` exposes a legacy/static company context; every production query/service path must be traced against canonical authenticated tenant membership before being declared tenant-safe.
2. `package.json` and `quality.yml` must be compared systematically against `scripts/check-*`, service tests and workflow steps; presence in one layer is not proof of end-to-end execution.
3. Migrations must be audited as a sequence against the contracts they support; file presence alone is not proof of deployed schema state.
4. UI routes/pages must be traced to actual service/database operations; a page or component alone is not proof of a working product capability.
5. Document Intelligence must be assessed for live execution and edge-case evidence, not merely static contracts.
6. K/L/M must be assessed for connected runtime evidence, not merely individual gates.
7. Release/certification must not be marked complete until current executable evidence exists.

## Reproducible inventory mechanism
`scripts/build-system-inventory.mjs` is now the canonical local/CI inventory generator. It walks the checked-out repository, excludes generated/dependency directories, counts and records source surfaces, workflows, migrations, checks, tests, docs, services and package scripts, and writes machine-readable and Markdown inventory artifacts.

Package command:
`npm run inventory:system`

This mechanism is intentionally separate from the completion index: it describes what exists; the Master Execution Index describes what that existence means for completion.

## Audit rule
Never promote an item from unknown/missing to complete merely because a similarly named file exists. Required chain:

`Requirement → Implementation → Persistence/Schema → Execution Command → Workflow/Entry Point → Runtime Dependency → Evidence → Production status`

## Next audit order
- Version/toolchain compatibility and lockfile truth.
- Complete `package.json` script ↔ script file ↔ workflow step mapping.
- Complete migration inventory and dependency/order/RLS/index mapping.
- Complete `src/App → pages → components → lib/services → DB` critical-flow map.
- Complete service boundary map for Document Intelligence.
- Complete J/K/L/M connected runtime map.
- Complete live evidence matrix for E/F/H/I and release certification.

## Status
This is the baseline inventory. It is not a claim that every line of every source file has been semantically reviewed. That semantic review is the next execution program, and every discovered fact must be appended to the Master Execution Index.
