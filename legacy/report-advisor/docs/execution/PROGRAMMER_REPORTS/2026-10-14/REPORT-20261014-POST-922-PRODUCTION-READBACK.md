# Production readback after PR #922 — 2026-10-14

## Exact checkpoint
At capture, main was `748947e1bf7268c8a67bbb69d7dffe125dfe2318`, a documentation-only merge whose functional parent/head remains `16bdb8a847087eab6f01a60733de480094e754df`. The latest Vercel production deployment `dpl_Fg21aVP1uEcSZqwytEWCGJKqhFNf` was READY on SHA `748947e1bf7268c8a67bbb69d7dffe125dfe2318`.

## Live requests
- Root `/`: HTTP 200; RTL HTML meta `aghbari-source-sha` matches `748947e1bf7268c8a67bbb69d7dffe125dfe2318`.
- `/api/health`: HTTP 503, `operational_token_not_configured`.
- `/api/tenant-canary`: HTTP 503, `operational_token_not_configured`.

## Exact blocker
Guarded release run [38596462967](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38596462967) failed during `Require deploy credentials`, before sync or deploy. Logs show missing `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. `RESILIENCE_OPERATIONAL_TOKEN` exists as an Actions secret but was not synced, since preflight stopped early. No credentials were generated or exposed.

## Netlify
Published deploy `6ac3d608e2e37d0008cc0222` serves old SHA `858ef8e3e5bc5bf74430555eadfb9e6767be348b`; tenant-canary falls back to SPA HTML. PR #918 Phase-F run `38570921284` failed live with `operational_token_not_configured`; logical backup/restore passed but overall resilience certification did not.

## Tests
PR #921 candidate `d5463ac5c7832fc5551ffe82ef44075fcf940168`: 37/37 runs passed [Build](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38595651162), [Quality](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38595651248), [Session Handoff](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38595651166), [Final Certification](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38595651018).
PR #922 candidate `57d4f336c62d6bda7e4eb59af478403a1befee5f`: 36/36 Actions passed; the PR was documentation-only.
Authenticated browser test: [Full Product Browser E2E](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38582005553) on earlier PR #920 candidate `652e29aef9745f2e7a1a5db224713fad411da43d` only.

## Result
- IMPLEMENTED: results UI and safe deploy concurrency hardening.
- READBACK-PROVEN: deployment state/SHA, root HTML source hash, blocked API bodies, workflow failed-preflight log.
- BROWSER-PROVEN: earlier UI candidate only.
- PRODUCTION-PROVEN: NOT_PROVEN.
- PRODUCT_COMPLETE: NO.
- NEXT ACTION: Authorized administrator restores missing GitHub Actions deployment credential(s); rerun guarded Vercel health proof. Separately restore Netlify token and rerun exact-head Phase-F. Do not relax fail-closed checks.
