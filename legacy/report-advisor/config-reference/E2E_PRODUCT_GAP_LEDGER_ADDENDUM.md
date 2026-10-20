# E2E Product Gap Ledger — Current Wave Addendum

Exact evidence boundary: `5be528826ac7e7aa1638e1b70784e9c22473506b`

| ID | Discovery | Severity | Expected | Actual | Status | Owner |
|---|---|---:|---|---|---|---|
| GAP-E2E-010 | Dashboard vs profitability financial truth | P1 | Currency mismatch must invalidate financial KPIs consistently | Company currency is SAR while staging sales/purchase source rows are YER; profitability flagged `CURRENCY_MISMATCH` while dashboard previously returned calculated values | FIXED + LIVE DB RETESTED | B/D |
| GAP-E2E-011 | Authenticated E2E CI green-state integrity | P1 | Missing auth secrets must make the E2E job non-green | Historical browser run was green with AUTH blocked; current workflow now explicitly preflights all six required runtime secrets and exits 2 when any are absent | FIXED / CURRENT-HEAD REPROOF PENDING | E |
| GAP-E2E-012 | Browser business-action oracle | P1 | Route coverage must assert business actions, not only navigation | Harness captures controls/network/console/screenshots/refresh, but full CRUD/import/document/report actions remain unauthenticated and therefore unproven | INCOMPLETE | A/E |

## Current live evidence
- Staging Supabase project: `fnqbvfuwbdpwvhcgzksl`.
- Two active authenticated identities are assigned to distinct default tenants.
- All 81 public tables have RLS enabled; 0 are RLS-disabled and 0 lack policies.
- Authenticated-role DB probes: zero cross-tenant core-table visibility; cross-tenant UPDATE/DELETE attempts affect zero rows; export/import foreign-company RPC attempts reject.
- Export RPC repair is live: authenticated execution succeeds; anon remains denied.
- Dashboard currency gate is live and retested for both tenant contexts: status becomes `INSUFFICIENT_DATA`, invalid financial KPIs become null, and financial breakdown arrays become empty when currency mismatch exists.

## Current external blockers
- GitHub Actions authenticated E2E secrets are not provisioned/available to the execution environment.
- No current-head Vercel deployment is available to serve as a production browser runtime.
- Supabase Auth leaked-password protection is disabled according to the live security advisor and requires control-plane configuration.

## Governance
Simulated JWT/database-role tests are DB-level evidence only. They do not certify browser authentication or browser tenant isolation. Historical SHA/deployment evidence is never reused for current-head certification.
