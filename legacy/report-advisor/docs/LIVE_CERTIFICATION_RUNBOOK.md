# Report-Advisor live certification runbook

This is the execution layer for the remaining production work. Repository contracts and deterministic gates are not treated as proof of live infrastructure certification.

## Gate 1 — tenant isolation and authorization

- Use two distinct certification tenants and two distinct users.
- Verify every read, write, search, export and retrieval path is tenant-scoped.
- Attempt deliberate cross-tenant reads and writes; every attempt must be denied.
- Verify anonymous access is denied where the product requires authentication.
- Record request, actor, tenant, policy result and evidence ID.

## Gate 2 — storage, signed URLs and realtime

- Create an object under tenant A and prove tenant B cannot list, read or obtain a usable signed URL.
- Verify signed URLs expire and cannot be substituted across tenants.
- Subscribe to tenant-scoped realtime channels and prove events from tenant B never arrive in tenant A's session.

## Gate 3 — AI retrieval isolation

- Index isolated tenant fixtures with deliberately unique marker phrases.
- Query tenant A for tenant B markers and require zero leakage.
- Verify retrieval namespaces include tenant identity and that raw source files are not exposed to analytics/recommendation layers.
- Record retrieval query, namespace, result IDs and evidence hashes.

## Gate 4 — backup and restore

- Execute a real backup against the target environment.
- Verify backup freshness, integrity and recoverability.
- Restore into an isolated target and compare schema, row counts, critical hashes and tenant boundaries.
- Record measured RPO/RTO; do not infer them from configuration.

## Gate 5 — resilience and worker recovery

- Start a durable job, terminate its worker after checkpoint creation and verify lease expiry/reclaim.
- Force a terminal failure and verify dead-letter persistence.
- Resume from the last valid checkpoint without duplicate transactional effects.
- Verify immutable execution evidence survives the recovery path.

## Gate 6 — migration and environment parity

- Run migrations from a clean database in canonical order.
- Run a staging dry-run against the release manifest.
- Detect schema drift and fail closed.
- Compare required runtime configuration and feature flags without printing secrets.

## Gate 7 — artifact, release and rollback assurance

- Verify release artifact SHA/signature at the deployment boundary.
- Execute a canary release and record stabilization telemetry.
- Execute a rollback drill and verify deterministic restoration of the previous certified state.
- Execute a forward-fix drill after rollback.
- Verify domain autonomy is disabled whenever any blocker is present.

## Gate 8 — final certification decision

Production autonomy is permitted only when every blocker is green with live evidence. Missing configuration, unavailable infrastructure, failed probes, stale backups, unresolved critical security findings, drift, insufficient evidence, or failed rollback keeps autonomy disabled.

The repository helper `scripts/live-certification-preflight.mjs` intentionally validates configuration only; it never substitutes configuration checks for the real probes above.
