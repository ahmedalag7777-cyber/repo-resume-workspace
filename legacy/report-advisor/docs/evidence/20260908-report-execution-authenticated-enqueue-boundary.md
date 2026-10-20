# Report Execution — Authenticated Server Enqueue Boundary

Date: 2026-09-08

## Exact boundary

The Vite/Vercel application now has a dedicated server endpoint at `api/report-execution-enqueue.mjs` on branch `fix/report-export-server-boundary-current-main`.

The endpoint:

1. accepts POST only;
2. requires a Supabase user Bearer token;
3. validates that token against Supabase Auth `/auth/v1/user`;
4. resolves the tenant exclusively through the authenticated `current_company_id()` RPC;
5. never accepts `tenantId` from the request body;
6. invokes the privileged durable enqueue RPC only from the server environment;
7. derives the durable job key from report identity plus the caller's idempotency key;
8. verifies that the returned durable job belongs to the same resolved tenant before returning `202`.

## Security boundary

The browser remains limited to the publishable/anon Supabase client. The service-role credential is referenced only by the server runtime helper and is never imported into browser code.

The endpoint does not grant the caller worker lease, claim, heartbeat, completion, or service-role authority. It only creates/returns a tenant-bound durable job reference.

## Database contract verified in Staging

The live `enqueue_report_execution_job` function accepts:

`(p_company_id uuid, p_job_key text, p_source_path text, p_source_hash text, p_evidence_keys text[], p_max_attempts integer)`

It is `SECURITY DEFINER`, has no `anon` or `authenticated` EXECUTE grant, and is executable only by `service_role`.

This is why the server boundary is required; the browser must not call this RPC directly.

## Scope boundary

This closes the missing **authenticated enqueue boundary** only. It does **not** certify that the report UI has been migrated to durable execution, nor does it claim that a worker consumer currently renders an on-demand report from this job. The next integration step is to bind the report request/source snapshot to a real durable worker consumer without exposing worker authority to the browser.

No Production alias, frozen RC, or Staging schema was mutated by this change.
