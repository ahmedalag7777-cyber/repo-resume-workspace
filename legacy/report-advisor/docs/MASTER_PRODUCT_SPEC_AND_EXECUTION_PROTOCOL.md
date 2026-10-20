# MASTER PRODUCT SPECIFICATION & STRICT COMPLETION PROTOCOL

**Project:** Report-Advisor / تطبيق الأغبري / بوابة الأغبري للمواد الغذائية  
**Repository:** `Report-Engainall/Report-Advisor`  
**Baseline HEAD:** `ffccf08e1ce4d5595d9ac448f310d62ce5d94e95`  
**Document status:** Master product, architecture, completion and engineering-control reference  
**Rule:** This document describes the target final product and the exact closure discipline. It does not certify runtime capabilities by documentation alone.

---

## 0. NON-NEGOTIABLE ENGINEERING LAW

1. Do not rebuild the project from scratch.
2. Do not replace React/Vite/Supabase/PostgreSQL or any core technology without a proven defect and an approved migration plan.
3. Do not reopen closed work unless new exact-head evidence proves regression.
4. Do not fabricate jobs, users, sessions, tenant data, reports, outcomes, OCR scores, metrics, evidence or CI passes.
5. Do not weaken, bypass or delete a failing gate merely to obtain green CI.
6. Do not mix evidence from different SHAs for certification.
7. Every certification claim must identify the exact commit SHA, environment, actor, tenant and test/evidence artifact.
8. Browser E2E must use real authenticated users and real tenant authority; no synthetic auth and no service-role browser sessions.
9. Service-role access is backend-only and must never be used as a substitute for user authorization.
10. Tenant isolation must be enforced in database/RLS/RPC/storage and verified adversarially, not merely hidden in UI.
11. No production alias mutation, rollback or environment mutation during forensic/certification work unless explicitly authorized as an operational action.
12. A UI element is not considered a working feature unless its underlying business side effect is real, persisted and verifiable.
13. Never invent a business trigger merely to satisfy a durable-queue test. Wire only the first legitimate production business side-effect boundary.
14. Prefer the smallest correct change. Preserve canonical contracts and migrations.
15. Before any write, inspect the current exact-head implementation and prove the defect or missing capability.
16. After a change, run the narrowest relevant tests first, then the affected closure gates, then broader gates as appropriate.
17. Record every real change with exact file paths, test commands, results and SHA.
18. When blocked by external infrastructure, report BLOCKED rather than changing application semantics to hide the blocker.
19. No speculative duplicate architecture, parallel source of truth, fake adapter or compatibility layer unless a concrete current-head requirement demands it.
20. The final sale-ready state is achieved only after code + database + security + authenticated runtime + E2E + operations + resilience + evidence + exact-head certification are all closed.

---

# 1. PRODUCT DEFINITION

Report-Advisor is a multi-tenant Arabic-first business intelligence and operational decision platform for wholesale grocery businesses. Its final value chain is:

`DATA → IMPORT → VALIDATE → RECONCILE → INTELLIGENCE → EVIDENCE → RECOMMENDATION → DECISION → APPROVAL → WORK → OUTCOME → REPORT`

It is not merely inventory software, a spreadsheet importer, a dashboard, or a report printer. It is intended to turn operational business data and documents into trustworthy information, explainable recommendations, governed decisions, executable work and measurable outcomes.

## 1.1 Target users

- Wholesale grocery owners.
- Food distributors.
- Grocery traders.
- Warehouse staff.
- Accountants.
- Managers/executives.
- Read-only business viewers.

## 1.2 Operating environment

- Arabic RTL as a first-class UI requirement.
- Mobile-first/PWA because the majority of target users are mobile users.
- Low-data operation.
- Resilience for slow/unstable internet environments.
- Fast navigation and bounded data loading.
- Installable PWA experience.

---

# 2. FINAL PRODUCT CAPABILITIES

## 2.1 Identity and access

- Supabase Auth.
- Real authenticated browser sessions.
- Tenant/company context.
- Role-based authorization.
- Manager, warehouse, accountant, viewer and system-admin roles.
- Approval-aware user lifecycle.
- Profile records linked to authenticated users.

## 2.2 Multi-tenancy

Every business object is tenant-scoped where applicable:

- users/profiles
- customers
- products
- categories
- prices
- inventory
- invoices/sales
- imported files/jobs
- documents
- reports
- snapshots
- recommendations
- decisions
- approvals
- work items
- outcomes
- evidence
- durable jobs

Tenant isolation must hold at UI, query, mutation, RPC, RLS, storage and worker boundaries.

## 2.3 Product/catalog management

Product fields include:

- image
- product name
- SKU/business key
- unit
- classification/category
- description
- available quantity
- product status
- independent customer-class pricing

The historical specification contains three independent customer price tiers. Prices must only be exposed according to the authorized customer category/business rules.

## 2.4 Category model

Historical operating datasets included:

- 25 main groups
- 85 subcategories
- 534 products
- 1,602 pricing rows

Later datasets expanded beyond 100 groups and 1,000 products. These figures are historical dataset sizes, not hard system limits.

UI requirements include horizontally browsable groups and placing “All” at the end of the group strip. Product quantity is not shown by default on the product card unless the UX requires it.

## 2.5 Product images

- WebP preferred.
- Historical target compression: approximately 30–80 KB per image.
- Optimize for mobile bandwidth and PWA performance.

## 2.6 Customers

- Tenant-scoped customer records.
- Customer classification.
- Price-tier relationship.
- Invoice/sales relationships.
- Secure tenant isolation.

## 2.7 Inventory

- Products and quantities.
- Warehouse context.
- Inventory intelligence.
- Demand/velocity analysis.
- Reconciliation against imported/source data.
- Decision-support signals.

## 2.8 Sales/invoices

- Canonical invoice/sales data.
- Import and reconciliation.
- Tenant-scoped persistence.
- Analytics and reporting inputs.
- No synthetic transaction data in production evidence.

---

# 3. IMPORT PLATFORM

The canonical import architecture is a governed pipeline, not a direct browser-to-table insert.

`UPLOAD → INSPECT → VALIDATE → NORMALIZE → DEDUPE → PREVIEW → COMMIT → RECONCILE → VERIFY → INTELLIGENCE`

Capabilities:

- XLS/XLSX processing.
- Zod validation.
- Business-key/SKU resolution.
- Deduplication.
- Chunking, historically around 500 rows per chunk.
- UPSERT semantics.
- Import job lifecycle.
- Locking.
- Finalization.
- Tenant-aware RPCs.
- Import provenance.
- Reconciliation.
- Failure reporting.
- Large-batch handling.

Historical tests exercised batches up to approximately 50,000 rows while UI dataset loading is intentionally bounded.

## 3.1 Onyx Pro

The project supports a canonical Onyx Pro adapter/mapping contract. Historical template size: 26 columns.

Canonical export fields include:

- SKU
- Item Name
- Unit
- Warehouse
- Quantity

Do not create a second competing mapping system.

---

# 4. DATA TRUTH

All analytics and decisions must originate from authoritative persisted data.

Forbidden:

- fabricated metrics
- random values
- mock production records
- local-only approval state
- synthetic outcomes
- arbitrary tenant IDs
- fake authenticated sessions
- zero/null coercion that changes business meaning
- currency assumptions without an explicit canonical definition

Every important metric must have a defined semantic meaning and authoritative source.

---

# 5. DOCUMENT INTELLIGENCE

The platform processes more than structured spreadsheet data.

Supported/intended document capabilities:

- PDF ingestion/rendering.
- Text extraction.
- OCR.
- Arabic OCR.
- Normalization.
- File fingerprinting/hash.
- Provenance.
- Reconciliation.
- Evidence creation.
- Decision linkage.

## 5.1 OCR

Primary historical implementation uses Tesseract.js with Arabic support. PaddleOCR integration/adapter work also exists historically.

OCR must preserve:

- recognized text
- confidence scores
- source/page/block provenance
- processing status
- errors/warnings

Confidence must never silently become zero when real confidence exists.

## 5.2 Golden corpus

Final closure requires real Arabic PDF/document fixtures representing realistic business documents and an end-to-end chain:

`DOCUMENT → OCR → NORMALIZE → DATABASE → RECONCILE → ANALYTICS → EVIDENCE → DECISION → OUTPUT`

---

# 6. FILE INTELLIGENCE AND WATCHED FOLDER

File handling must be secure and deterministic.

Requirements:

- file type validation
- safe archive handling
- archive traversal protection
- size/boundary controls
- hash/fingerprint
- duplicate detection
- tenant binding
- provenance
- terminal processing state
- retry/failure handling

Watched Folder target lifecycle:

`DISCOVER → HASH → IDENTIFY → VALIDATE → PROCESS → RECONCILE → FINALIZE`

No duplicate processing merely because the watcher saw the same file again.

---

# 7. DASHBOARD AND BUSINESS INTELLIGENCE

Dashboard is a decision surface, not a decorative chart page.

It should expose, where supported by authoritative data:

- business health
- sales trends
- inventory state
- demand velocity
- customer/business activity
- anomalies
- risks
- opportunities
- recommendations
- evidence links
- decision state
- operational status

The dashboard must fail closed when required runtime evidence is unavailable rather than inventing a plausible result.

---

# 8. INTELLIGENCE ENGINE

Relevant intelligence layers include:

- consolidated intelligence
- inventory intelligence
- demand velocity
- batch decision analysis
- safe metrics
- forecasting/calibration
- analysis cache
- invalidation
- concurrency controls
- bounded concurrency
- analysis batch runner

Performance and semantic correctness are separate acceptance dimensions. A fast wrong number is a failure.

---

# 9. LOCAL AI

Historical/local AI architecture:

- Ollama at `localhost:11434`.
- `qwen3:4b` for local language interaction.
- `nomic-embed-text:latest` for embeddings.

Possible uses:

- business chat
- semantic retrieval
- document assistance
- internal reasoning/analysis

AI is an analysis layer, not the canonical business truth source.

---

# 10. EVIDENCE ARCHITECTURE

Every material recommendation/decision should be traceable to evidence.

Evidence chain:

`SOURCE → SNAPSHOT → HASH/PROVENANCE → ANALYSIS → RECOMMENDATION → DECISION → WORK → OUTCOME`

Evidence must be:

- tenant-scoped
- persisted
- reproducible
- source-linked
- exact enough to explain the decision

---

# 11. DECISION EXPERIENCE

Final decision lifecycle:

1. Command
2. Evidence
3. Recommendation
4. Decision
5. Approval
6. Work
7. Outcome

The Decision Experience must use persisted runtime data.

Recommendation status must be changed through tenant-authorized runtime mechanisms.

Approval must not be a local UI boolean pretending to be a durable business action.

Work items must be persisted and tenant-authorized.

Outcome must be evidence-backed and linked to the exact decision/recommendation fingerprint.

No synthetic outcome is acceptable for production certification.

---

# 12. REPORTING

Reports must be authoritative, reproducible and traceable.

A report execution request should carry, where required:

- tenant/company identity
- requested-by identity
- governed route plan
- source snapshot ID
- source path
- source hash
- idempotency key
- requested output formats

Report output must not silently bypass the durable execution boundary when the business operation requires durable execution.

Browser print/export can remain a legitimate presentation capability where appropriate, but it must not be misrepresented as a durable worker lifecycle.

---

# 13. DURABLE EXECUTION / WORKER

Canonical architecture:

`REAL BUSINESS TRIGGER → GUARDED ENTRYPOINT → DURABLE ENQUEUE RPC → TENANT-SCOPED JOB → CLAIM → LEASE → HEARTBEAT/CHECKPOINT → COMPLETE/FAIL/RETRY/DLQ`

Required guarantees:

- tenant context
- service-role-only worker execution where required
- idempotency
- lease token
- fencing
- checkpointing
- retry policy
- dead-letter handling
- recovery
- stale worker rejection

Critical rule: do not invent a fake trigger solely to prove the queue works.

The current documented gap is the verified real application/business trigger that legitimately creates a report execution from an authoritative source snapshot/path/hash.

---

# 14. REAL-TIME / NOTIFICATIONS / INTEGRATIONS

System health and runtime architecture account for:

- Supabase Realtime
- desktop notifications
- WhatsApp integration/status
- product image storage
- database health
- backup status

An indicator means only that the subsystem can be observed/configured; production certification requires real runtime evidence for material capabilities.

---

# 15. PWA / FRONTEND UX

Frontend principles:

- Arabic RTL.
- Mobile-first.
- Fast first meaningful interaction.
- Bounded reads.
- Low data use.
- Installable PWA.
- Clear loading/error/empty states.
- No UI that falsely implies an unavailable backend capability.
- Reusable components.
- Accessible controls.
- Consistent route/sidebar parity.

Current repository is React/Vite-based. The current package manifest includes React, React DOM, React Router DOM, Vite, Supabase JS, Tesseract.js, PDF.js, XLSX and Recharts among the principal dependencies.

---

# 16. SECURITY MODEL

Security is a product requirement, not a release afterthought.

Required controls:

- RLS on tenant tables.
- No unintended anonymous policies.
- tenant-bound foreign keys.
- tenant-aware RPCs.
- SECURITY DEFINER hardening where used.
- pinned search_path for security-sensitive functions.
- restricted EXECUTE grants.
- service-role isolation.
- Storage tenant boundaries.
- authenticated browser proof.
- adversarial Tenant A/B tests.

Historical deep security evidence has shown strong coverage across critical tables/functions, but certification must be regenerated against the exact release SHA/environment.

---

# 17. DATABASE

Supabase/PostgreSQL is the authoritative persistence layer.

Expected domains include:

- Auth/profile
- companies/tenants
- customers
- products/catalog
- categories
- pricing
- warehouses/inventory
- invoices/sales
- import jobs/batches
- documents/files
- snapshots
- intelligence/metrics
- recommendations
- decisions/approvals
- work items
- outcomes
- evidence
- report execution jobs
- operational metadata

Migrations are forward-only. Do not rewrite migration history to make a fresh database appear compatible.

---

# 18. PERFORMANCE TARGETS

Historical product targets:

| Metric | Target |
|---|---:|
| Read P95 | ≤ 300 ms |
| Write P95 | ≤ 800 ms |
| Preview P95 | ≤ 1500 ms |
| UI dataset target | bounded around 5,000 rows |
| Batch processing history | tested up to ~50,000 rows |

These are targets, not automatic certification. Exact-head measurement is required.

---

# 19. OPERATIONS

Production readiness includes:

- Vercel deployment correctness.
- Environment-variable correctness.
- Supabase production/staging separation.
- database backup.
- restore.
- rollback.
- monitoring.
- logs.
- release artifact integrity.
- exact deployment identity.
- incident recovery.

Production alias binding must be treated as an explicit operational state and never changed casually during certification.

---

# 20. COMPLETE ARCHITECTURE

```text
                                  ┌──────────────────────────┐
                                  │      USERS / BROWSER     │
                                  │ Arabic RTL / Mobile PWA  │
                                  └────────────┬─────────────┘
                                               │
                                               ▼
                                  ┌──────────────────────────┐
                                  │      React UI Shell       │
                                  │ Routes / Layout / UX      │
                                  └────────────┬─────────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
                ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
                │ Auth / Session │   │ Queries / Read │   │ Commands /     │
                │ Tenant Context │   │ Models / Cache │   │ Mutations      │
                └───────┬────────┘   └───────┬────────┘   └───────┬────────┘
                        └─────────────────────┼────────────────────┘
                                              ▼
                              ┌─────────────────────────────┐
                              │       Domain Layer          │
                              │ tenant / import / data /    │
                              │ intelligence / decision     │
                              └──────────────┬──────────────┘
                                             │
                  ┌──────────────────────────┼─────────────────────────┐
                  ▼                          ▼                         ▼
        ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
        │ Import Engine    │       │ Document Engine  │       │ Intelligence/AI │
        │ Excel / Onyx     │       │ PDF / OCR / File │       │ Analytics / LLM  │
        └────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
                 └──────────────────────────┼──────────────────────────┘
                                            ▼
                              ┌─────────────────────────────┐
                              │ Evidence / Snapshot / Hash │
                              │ Provenance / Truth Boundary │
                              └──────────────┬──────────────┘
                                             ▼
                              ┌─────────────────────────────┐
                              │ Decision Intelligence      │
                              │ Recommendation / Decision  │
                              │ Approval                    │
                              └──────────────┬──────────────┘
                                             ▼
                              ┌─────────────────────────────┐
                              │ Work / Durable Execution    │
                              │ Queue / Lease / Fencing     │
                              │ Retry / DLQ / Recovery      │
                              └──────────────┬──────────────┘
                                             ▼
                              ┌─────────────────────────────┐
                              │ Outcome / Measurement       │
                              └──────────────┬──────────────┘
                                             ▼
                              ┌─────────────────────────────┐
                              │ Reports / Exports / Surfaces │
                              └─────────────────────────────┘

                                      PERSISTENCE
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
      ┌──────────────┐              ┌────────────────┐              ┌──────────────┐
      │ Supabase Auth│              │ PostgreSQL/RLS  │              │ Supabase     │
      │ Sessions     │              │ RPC/Indexes     │              │ Storage      │
      └──────────────┘              └────────────────┘              └──────────────┘

                                  OPERATIONS / EXTERNAL
             ┌──────────────────────┬──────────────────────┬────────────────────┐
             ▼                      ▼                      ▼                    ▼
          Vercel                 Ollama                 WhatsApp             Realtime
        Deployment              Local AI               Messaging             Events
```

---

# 21. ARCHITECTURE TREE

```text
Report-Advisor/
├── .github/
│   └── workflows/
│       ├── quality / bootstrap / diagnostic
│       ├── security / tenant / RLS
│       ├── import / migration / data-truth
│       ├── document / OCR / golden-corpus
│       ├── decision / approval / work / outcome
│       ├── report-execution / worker / resilience
│       ├── performance / production-scale
│       ├── backup / restore / rollback
│       └── release / certification / evidence
│
├── docs/
│   ├── MASTER_EXECUTION_INDEX.md
│   ├── MASTER_PRODUCT_SPEC_AND_EXECUTION_PROTOCOL.md
│   ├── architecture/
│   ├── evidence/
│   ├── operations/
│   └── release/
│
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── customers/
│   │   ├── inventory/
│   │   ├── import/
│   │   ├── documents/
│   │   ├── reports/
│   │   ├── decisions/
│   │   ├── evidence/
│   │   └── admin/
│   │
│   ├── pages/
│   │   ├── Dashboard
│   │   ├── Products
│   │   ├── Customers
│   │   ├── Inventory
│   │   ├── Import
│   │   ├── Reports
│   │   ├── ExecutiveReport
│   │   ├── DecisionExperience
│   │   ├── DecisionWorkspace
│   │   ├── SystemHealth
│   │   └── Settings
│   │
│   ├── lib/
│   │   ├── supabase / auth
│   │   ├── tenant / company context
│   │   ├── import / upsert / reconciliation
│   │   ├── onyx adapter
│   │   ├── file engine / file security
│   │   ├── document intelligence
│   │   ├── OCR
│   │   ├── analytics / metrics
│   │   ├── inventory intelligence
│   │   ├── demand velocity
│   │   ├── forecasting / calibration
│   │   ├── analysis cache / invalidation
│   │   ├── evidence / snapshots
│   │   ├── decision runtime
│   │   ├── approval / work / outcome
│   │   ├── durable execution / queue / worker
│   │   └── report execution
│   │
│   └── server/
│       └── server-side business/runtime boundaries
│
├── scripts/
│   ├── architecture contracts
│   ├── P0 security/tenant contracts
│   ├── migration/schema audits
│   ├── import contracts/regressions
│   ├── document/OCR/golden corpus
│   ├── decision lifecycle
│   ├── report execution/worker runtime
│   ├── performance/scalability
│   ├── resilience/backup/restore
│   ├── production certification
│   └── E2E/runtime tests
│
├── supabase/
│   ├── migrations/
│   └── functions/
│
├── public/
│   ├── icons
│   ├── PWA assets
│   └── static assets
│
├── package.json
├── tsconfig*.json
├── vite.config.*
├── eslint.config.*
├── postcss.config.*
└── README / project configuration
```

The tree above is the architectural map. Exact filenames must always be taken from the current Git tree before modifying code; never create a guessed duplicate path because the architectural name appears here.

---

# 22. EXACT REMAINING CLOSURE PROGRAM

## P0 — AUTHENTICATED PRODUCT RUNTIME

### A. Real Authenticated Browser E2E

Prove with real Actor A and Actor B:

- login
- session persistence
- refresh
- tenant resolution
- dashboard read
- product/customer/inventory reads
- authorized mutation where supported
- import path
- report path
- decision path
- logout

**Exit:** real browser evidence attached to exact release SHA.

### B. Adversarial Tenant Isolation

For both directions A→B and B→A, test:

- UI
- direct REST/query
- RPC
- storage
- import
- report
- decision
- evidence
- work
- outcome

**Exit:** zero cross-tenant read/write leakage.

---

## P1 — DATABASE / MIGRATIONS

### C. Fresh migration replay

- clean database
- apply every canonical migration
- compare schema
- compare constraints
- compare indexes
- compare RPC signatures
- compare grants
- compare RLS
- compare storage policies

**Exit:** fresh migration parity against the intended environment.

---

## P1 — IMPORT / DATA TRUTH

### D. Real import closure

- real business file
- preview
- validation
- dedupe
- commit
- DB read-back
- reconciliation
- exact counts
- tenant isolation
- error-path proof

**Exit:** one real import is fully reproducible and auditable.

---

## P1 — DOCUMENT / OCR

### E. Arabic Golden Corpus

- real Arabic PDF
- render
- OCR
- confidence
- normalization
- structured extraction
- persistence
- reconciliation
- intelligence
- evidence
- report/decision output

**Exit:** golden corpus passes without synthetic substitutions.

---

## P1 — WATCHED FOLDER

### F. Real watched-folder pipeline

- discover
- hash
- dedupe
- validate
- tenant bind
- process
- terminal status
- retry
- recovery

**Exit:** real file reaches a correct terminal state exactly once.

---

## P1 — DURABLE WORKER

### G. Worker lifecycle

- enqueue
- claim
- lease
- heartbeat
- checkpoint
- crash/lease expiry
- stale worker fencing
- retry
- DLQ
- recovery
- completion

**Exit:** lifecycle is proven against real durable persistence.

---

## P1 — REPORT EXECUTION

### H. Real business trigger

Identify the legitimate report-generation side-effect boundary. Then wire:

`business action → enqueueDurableReportExecution → guarded entrypoint → canonical RPC → job`

The trigger must supply authoritative tenant identity, requester, idempotency, governed route, source snapshot ID, source path/hash and requested formats as required by the canonical contract.

Do not connect service-role queue execution directly to a browser export helper merely to make a test pass.

**Exit:** one real authenticated business action creates exactly one durable job and the job lifecycle is verifiable.

---

## P1 — DECISION RUNTIME

### I. Full lifecycle

Real authenticated session:

`Command → Evidence → Recommendation → Decision → Approval → Work → Outcome`

Every stage must persist and be tenant-authorized.

**Exit:** persisted lifecycle with evidence-backed outcome.

---

## P1 — RESILIENCE

### J. Backup/restore

- real backup
- integrity
- isolated restore
- post-restore smoke
- tenant isolation
- RPO/RTO

### K. Rollback

- identify release
- execute controlled rollback procedure
- verify runtime
- verify data compatibility
- record exact deployment IDs

**Exit:** recovery procedures are proven, not merely documented.

---

## P2 — PERFORMANCE

### L. Current exact-head performance

Measure:

- read P50/P95/P99
- write P50/P95/P99
- preview P50/P95/P99
- large imports
- dashboard load
- concurrent analysis
- worker throughput
- failure rates

**Exit:** targets met or explicitly approved with measured exception.

---

## P2 — OBSERVABILITY

### M. Operational observability

Prove:

- logs
- structured errors
- runtime health
- worker health
- queue state
- alerts
- incident visibility
- recovery visibility

---

## P2 — CI / RELEASE

### N. Runner and workflow integrity

If a GitHub runner fails before steps execute, do not weaken application gates. Diagnose/restore runner infrastructure or document the external blocker.

### O. Exact release certification

The final candidate SHA must independently pass:

- build
- lint
- typecheck
- contracts
- security
- migrations
- import
- document/OCR
- decision
- worker/report execution
- E2E
- performance
- resilience
- evidence integrity
- production readiness

Then create the final release artifact from that exact SHA.

---

# 23. CERTIFICATION GATE

The product may be called **PRODUCTION CERTIFIED / SALE READY** only when all critical rows below are PASS on the same release SHA or are explicitly documented as non-blocking by the release authority:

| Domain | Required evidence |
|---|---|
| Code | exact release SHA |
| Build | successful production build |
| Auth | real authenticated runtime |
| Tenant | adversarial A/B isolation |
| DB | schema/migration parity |
| RLS | verified policies/grants |
| Import | real end-to-end import |
| Documents | real document processing |
| OCR | Arabic golden corpus |
| Intelligence | authoritative metrics |
| Evidence | source-linked evidence |
| Decision | real persisted lifecycle |
| Work | real persisted execution |
| Outcome | real evidence-backed result |
| Report | real durable/report lifecycle where required |
| Worker | claim/lease/retry/recovery |
| Watched folder | real file lifecycle |
| Performance | current-head measurements |
| Backup | real backup evidence |
| Restore | real restore evidence |
| Rollback | controlled rollback evidence |
| Observability | operational visibility |
| CI | required workflows pass |
| Release | exact artifact/commit integrity |

No green synthetic contract alone can replace a missing runtime proof.

---

# 24. STRICT PROGRAMMER EXECUTION ORDER

The programmer/agent MUST execute in this order, while parallelizing independent work when safe:

1. Read this file completely.
2. Read `docs/MASTER_EXECUTION_INDEX.md`.
3. Record current `HEAD`.
4. Inspect current Git status and branch.
5. Inspect the exact implementation before changing anything.
6. Inventory all currently open P0/P1/P2 blockers.
7. Select only blockers that are actionable from the available environment.
8. Work in independent tracks in parallel where no dependency exists.
9. For every defect, reproduce it first.
10. Apply the smallest canonical fix.
11. Run focused regression tests.
12. Run related contract gates.
13. Run runtime tests when environment permits.
14. Record exact evidence.
15. Commit with a precise message.
16. Re-run the relevant gates against the new SHA.
17. Never certify based on the previous SHA.
18. Continue immediately to the next independent blocker.
19. Stop only when the current environment truly cannot provide the required external evidence.
20. At a blocker, write the exact missing access/dependency and continue all other independent tracks.

---

# 25. PROGRAMMER COMMAND — FULL MASTER EXECUTION ORDER

Use this command as the strict instruction to any programmer/agent working on the repository:

```text
MASTER EXECUTION COMMAND — REPORT-ADVISOR

You are the implementation engineer for Report-Advisor.
Your job is to COMPLETE the existing product, not redesign it and not rebuild it.

READ FIRST:
1. docs/MASTER_PRODUCT_SPEC_AND_EXECUTION_PROTOCOL.md
2. docs/MASTER_EXECUTION_INDEX.md
3. current git HEAD and working tree
4. current relevant implementation files

ABSOLUTE RULES:
- Do not rebuild from scratch.
- Do not replace the stack.
- Do not invent features merely to satisfy tests.
- Do not fabricate users, tenants, jobs, reports, outcomes, OCR, metrics or evidence.
- Do not use synthetic authentication for E2E.
- Do not use service-role as browser authentication.
- Do not weaken/delete/bypass gates.
- Do not mix evidence from different SHAs.
- Do not reopen closed work without exact-head regression evidence.
- Do not create duplicate architecture when a canonical implementation exists.
- Do not rewrite migration history.
- Do not mutate production aliases during certification/forensics unless explicitly authorized.
- Do not claim PASS without runtime evidence when runtime evidence is required.
- If external infrastructure blocks a test, mark it BLOCKED and continue independent work.

PRIMARY OBJECTIVE:
Drive the repository from the current state to a genuinely production-certified, sale-ready product.

EXECUTION MODEL:
A. Inspect → reproduce → diagnose → smallest correct fix → test → evidence → commit.
B. Parallelize independent tracks.
C. Never wait unnecessarily on a blocked external track.
D. Never substitute a fake implementation for an unavailable environment capability.

CLOSURE TRACKS:
P0 AUTH:
- real Actor A/B authenticated browser sessions
- tenant context
- refresh/persistence
- complete product flows

P0 TENANT:
- adversarial A→B and B→A UI/API/RPC/storage/import/report/decision/evidence/work/outcome isolation

P1 DATABASE:
- fresh migration replay
- schema/RPC/RLS/index/grant parity

P1 IMPORT:
- real file → preview → validation → commit → reconciliation → read-back

P1 DOCUMENT/OCR:
- Arabic golden corpus end-to-end
- confidence/provenance integrity

P1 WATCHED FOLDER:
- discover → hash → dedupe → process → terminal state → retry/recovery

P1 WORKER:
- enqueue → claim → lease → heartbeat → checkpoint → fencing → retry → DLQ → recovery → completion

P1 REPORT EXECUTION:
- locate the FIRST REAL business report-generation side-effect boundary
- wire it to the canonical guarded durable enqueue boundary
- do NOT wire service-role directly to browser export
- prove exactly-once/idempotent durable creation from a legitimate business action

P1 DECISION:
- Command → Evidence → Recommendation → Decision → Approval → Work → Outcome
- real authenticated persisted runtime only

P1 RESILIENCE:
- backup
- restore
- tenant isolation after restore
- RPO/RTO
- rollback drill

P2 PERFORMANCE:
- current-head P50/P95/P99
- read/write/preview
- dashboard
- import
- concurrency
- worker throughput

P2 OBSERVABILITY:
- logs
- failures
- health
- queue/worker state
- alerts
- recovery visibility

P2 RELEASE:
- build/lint/typecheck/contracts/security/runtime/E2E/performance/resilience
- exact release SHA
- exact release artifact

WHEN YOU FIND A DEFECT:
1. Give exact file/path/function.
2. Explain the failure mechanism.
3. Fix only the defect.
4. Preserve canonical contracts.
5. Run focused regression.
6. Run affected closure gate.
7. Commit.
8. Report exact SHA.

WHEN YOU FIND NO CODE DEFECT:
Do not manufacture one. Move to the next independent closure track.

WHEN A TEST FAILS:
Classify it as:
- REAL CODE DEFECT
- TEST/CONTRACT DEFECT
- DATA/ENVIRONMENT DEFECT
- EXTERNAL INFRASTRUCTURE BLOCKER
Then fix only what belongs to the repository.

WHEN RUNTIME EVIDENCE IS REQUIRED:
Do not infer it from static code.
Do not call a contract PASS a runtime PASS.

FINAL REPORT FORMAT:
EXECUTED:
- exact changes
- exact files
- exact commands/tests

VERIFIED:
- exact PASS evidence
- exact SHA

OPEN:
- remaining closure items

BLOCKED:
- external blockers only, with exact dependency

NEXT:
- immediately continue with the highest-value independent closure track

The goal is not to make the project look complete.
The goal is to make it actually complete.
```

---

# 26. DEFINITION OF DONE

The project is DONE only when the following statement is truthful:

> A real business user can authenticate into the correct tenant, operate the real product/inventory/customer/import/report/decision workflows, have their data remain isolated, have source data and documents traced through intelligence and evidence, create governed decisions and work, measure outcomes, execute durable workloads with recovery guarantees, and operate the system in production with verified backup/restore/rollback, performance and observability — all proven against the exact release SHA.

Anything less is **NOT FINAL CERTIFICATION**.

---

# 27. CURRENT BASELINE NOTE

This document is intentionally a master target and control document. The current repository baseline remains the source of truth for exact filenames and implementation details. The current package manifest confirms the project is a React/Vite/Supabase-oriented application with extensive contract and closure scripts. The master execution index remains authoritative for the live evidence ledger.

**Never edit this document to turn a BLOCKED item into PASS. Update status only after actual evidence exists.**
