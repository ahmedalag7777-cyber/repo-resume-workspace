# CYCLE-017 — Import terminal lifecycle security closure

Date: 2026-08-30

## Start head
`a705f9c5b8b161418337d932a27b3029071d39f2`

## Finding
The canonical `import_finish_job(uuid,text,jsonb,text)` lifecycle RPC could be called with arbitrary status text and did not explicitly bind the job to `current_company_id()` or prevent a terminal job from being finalized again. Existing RLS reduced cross-tenant exposure, but the RPC contract itself was not fail-closed and allowed same-tenant terminal-state resurrection risk.

## Fix
- Replaced the terminal RPC with explicit `SECURITY INVOKER` and `search_path=public`.
- Requires authenticated caller tenant context.
- Requires terminal status in the exact allowed set: `completed | partial | failed | cancelled`.
- Requires the target import job to belong to the caller tenant.
- Rejects already-terminal jobs with `IMPORT_JOB_ALREADY_TERMINAL`.
- Final UPDATE is restricted to `queued | processing` for the caller tenant.
- Preserved anonymous denial and authenticated-only execution.
- Added adversarial test-of-test contract coverage.
- Added focused CI workflow plus typecheck.

## Commits
- `0ec92c0ae9e2e280117a3d01da5b7a4bef295321` — lifecycle migration
- `8bf4f4754f8967f2768c862895bb64f666e6dcbd` — adversarial contract test
- `a638f30a3effd2f2dd9e691de8d79eb397f74c1d` — focused CI

## Runtime boundary
No live mutation or production certification is claimed by this cycle until fresh exact-head CI evidence exists.
