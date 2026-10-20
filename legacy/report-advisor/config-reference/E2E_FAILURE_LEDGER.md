# E2E Failure Ledger

## Governance
- Evidence is exact-HEAD bound.
- PASS requires real execution, correct result, evidence, and exact HEAD.
- BLOCKED means the environment prevents proof.
- NOT PROVEN means the behavior was not established.
- FAIL means the flow executed and exposed a defect.

## Current Wave
- Baseline HEAD: `083225068f1e2d390f6e1d50e8b178a1e8e1bacb`
- Harness introduction HEAD: `396086781a4723c23a90a8486b8b4cf81936bec9`
- Browser CI workflow HEAD: `aa155ffdfce7a0addd17b337677e4b5c3039376d`
- Golden corpus contract repair HEAD: `38394120323da4f73bd2765b1f754b27e100111b`
- Runtime browser execution: pending fresh GitHub Actions run on current exact HEAD.

## Findings

| E2E ID | Exact HEAD | Flow | Scenario | Actor | Tenant | Expected | Actual | Status | Severity | Layer | Evidence | Root Cause | Fix | Fix Commit | Targeted Retest | Regression Retest | Final Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E2E-AUTH-001 | `38394120323da4f73bd2765b1f754b27e100111b` | Auth bootstrap | Missing workflow credentials | none | unknown | Authenticated runtime executes with real credentials | Credentials are not observable from repository code and are supplied only by GitHub secrets | BLOCKED | P0 | Environment | Pending workflow execution | External secret availability | None permitted; no auth bypass | — | Pending | Pending | BLOCKED until runtime credentials are available |
| E2E-PROD-001 | `a0897a2cef87d55d6cd91c342b86cf69c469b997` | Full Product Browser + real business persistence | Product readback after authenticated create | Actor A | `f68a7e91-3c7e-46fb-97a8-e339bec04e13` | Newly created product is persisted and searchable/readable through the Products UI | DB insert succeeded, but Products UI failed closed with `REPORT_QUERY_LIMIT_EXCEEDED: products require explicit pagination`; the tenant contained 501 products while the legacy query hard-limited 500 | FAIL | P0 | Product UI/query | Exact-head browser job `35265216931` | ProductsPage used unpaginated `fetchProducts()` and then applied client-side search; the query intentionally fails when more than 500 rows exist | Added tenant-scoped `fetchProductsPage()` with server-side search and bounded pagination; ProductsPage now reads pages with explicit page controls | `aefb30ca21abba334b63ae73f2afb1c2ceb89ab8` + `6fb728ea1ac0a4f985225c3b6229ee96089ee67a` | Pending | Pending | NOT PROVEN until fresh exact-head browser + business persistence evidence |

## Discovery Notes
- Existing `scripts/run-decision-runtime-e2e.mjs` is API/RPC-level authenticated runtime testing, not browser E2E.
- Browser harness is intentionally separate and uses a real Chromium browser against the exact-head built application.
- No browser PASS is inferred from API tests, mocks, old deployments, or static contracts.
- Route reachability checks are diagnostic only; page load alone does not certify business correctness.

\n## 2026-09-20 — Current Exact-Head Findings on `24470717174d0a5de4b4056dfd4366defc5e0982`\n\n- **E2E-HEAD-244-001 — Quality auth/tenant contract drift**: RUN `35529982758`, JOB `106128752491`. The application Header already resolves `current_company_id` and maps a null tenant to `degraded`; the failure was caused by a brittle exact-string assertion in `check-auth-tenant-convergence.mjs`. **Status: FIXED IN SOURCE, FRESH PROOF PENDING.**\n- **E2E-HEAD-244-002 — Real business import completion boundary**: RUN `35529982663`, JOB `106128751982`, exact head `244707...`. Customers and products completed with real persistence/readback. The invoice path reached the canonical import execution and the browser timed out after 30s waiting for the completion heading. Staging inspection showed import job `f41b36bf-ee60-4d66-8cf2-8d87acce002e` still `processing` at 0/1 and durable execution job `a08564c2-54cd-4a31-9932-9513e15f7304` at checkpoint `validated`. **Status: FIXED IN SOURCE (authoritative bounded wait + checkpoint diagnostics), FRESH RUNTIME PROOF PENDING.**\n- **Evidence artifacts:** browser artifact `10611112795`, KPI artifact `10610753640`, real-business artifact `10610853365` are all bound to the exact head above and are diagnostic evidence only; no PASS is transferred.\n

## 2026-09-20 — Exact-head follow-up: `3e25a6b8ec8e992bb179520d6a93826854cdd5cc`

- **E2E-HEAD-3E-001 — Auth contract first repair was too syntactic:** fresh Quality run `35532137546` still rejected the regex form. Source is now simplified to the actual fail-closed invariant: unresolved `companyId` must map to `degraded`.
- **E2E-HEAD-3E-002 — Business E2E schema mismatch:** fresh Browser run `35532137482` reached the new authoritative waiter but queried nonexistent `import_jobs.entity_type`. Canonical schema uses `import_jobs.job_type`; source is now corrected.
- **E2E-HEAD-3E-003 — Storage runtime:** run `35532137495` failed on live Supabase `current_company_id` with HTTP 401 `PGRST303 JWT issued at future`. This is an external/runtime clock-token condition, not a source PASS. Keep fail-closed; retry only after the auth runtime can issue a valid token.
- **E2E-HEAD-3E-004 — Phase-F:** run `35532137381` failed in live resilience probes after local/static resilience checks passed. Treat as external operational evidence boundary until the required live resilience inputs are available.
