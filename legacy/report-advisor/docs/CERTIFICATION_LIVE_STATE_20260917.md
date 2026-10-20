# Certification Live State — 2026-09-17

## Exact authority
- Certification PR: #479
- Branch: `fix/release-manifest-certification-sha-20260917`
- Exact HEAD: `907f99029a6c73fed17deb032a26bf4e5df27c99`

## Closed in this cycle
- Customer fixture changed from sparse/unmapped `segment` to mapped high-confidence fields.
- `customer_number` changed to mapped source header `customer number` after exact screenshot evidence showed the underscore header was unmapped.
- Business E2E quality-approval interaction changed from brittle CSS label targeting to accessible checkbox role targeting.
- No production quality gate, durable runner, RPC, migration, tenant boundary, security rule, or certification boundary was weakened.

## Current workflow
- Full Product Browser E2E #1016 is running on exact HEAD `907f99029...`.
- Final Certification Gate #4207 and Quality #5232 are queued for the same exact HEAD.
- Multiple independent security/truth/data/UI/Windows gates are already running or passing.

## Deployment
- No Vercel deployment for `907f99029...` exists yet. A prior exact-SHA preview deployment existed for `36da4250...`; preview evidence is not production evidence.

## Durable execution
- Canonical claim/heartbeat/checkpoint/complete/fail/retry RPCs exist and are tenant-scoped/fail-closed.
- Historical worker-heartbeat work exists in PR #21 but is not a deployed scheduler/worker.
- Staging currently exposes no Supabase Edge Function worker, and no cron job for `report_execution` was found through the accessible SQL surface. No duplicate worker is being introduced.

## Closure rule
No historical evidence is promoted to `907f99029...`. Final production certification requires fresh exact-SHA runtime/business evidence plus exact-SHA production deployment and smoke/readback.
