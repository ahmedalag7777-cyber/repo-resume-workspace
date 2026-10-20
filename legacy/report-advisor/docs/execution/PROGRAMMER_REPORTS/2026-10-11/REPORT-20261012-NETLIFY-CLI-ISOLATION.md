# Execution report — 2026-10-12 — Netlify CLI and canonical source linkage

- Repository: Report-Engainall/Report-Advisor
- PR #912: open, not merged
- Code head: [d9020f76bf62](https://github.com/Report-Engainall/Report-Advisor/commit/d9020f76bf62a095db16aed6a340831812480567)
- Product complete: **NO**
- Updated: 2026-10-12T17:14:27.901Z

## First failure and repair

Full Product Browser E2E run [38281581401](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581401) on predecessor 717fcf2299f4cc8ef084eb120f3323410ba4cf79 failed at Install deterministic Netlify CLI before the app preview or authenticated journey. The exact npm error was ETARGET: No matching version found for @typescript-eslint/visitor-keys@8.71.2. The old step installed Netlify CLI directly inside the application workspace with npm install --no-save --package-lock=false, unnecessarily re-resolving app dependency metadata.

The workflow now creates an isolated RUNNER_TEMP/report-advisor-netlify-cli prefix, installs pinned netlify-cli@27.10.2 there, and uses its binary directly for preview startup. Application dependencies/package lock and browser assertions are not changed.

## Canonical-import mismatch confirmed

A separate matrix issue came from the report's analysis snapshot pointing to completed import 0c6a6a22-c308-4bef-8ca9-55b29fa3bdf5 with 610 processed but zero valid rows. Same tenant and exact hash had 610 canonical rows in valid import 88810977-7704-4b1d-b808-384a99c6d91d, and the canonical_import_commits record 8da99f16-eaaf-407b-8d85-89ad87dbc870 anchors row 49f463c3-ee4c-446b-9412-1699de65ce94 to that import. The matrix now resolves its canonical import through this persisted commit anchor and validates row ID/company/hash before accepting the import; output shows both the analysis and canonical import IDs. Regression helpers test mismatch/fail-closed behavior. All database investigation was read-only.

## Prior gate results (predecessor only)

On 717fcf…: Build [38281581629](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581629), Quality [38281581259](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581259), Handoff [38281581884](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581884), Data Quality [38281581638](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581638), Final Certification [38281581473](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581473), and Phase-F [38281581295](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581295) passed; Phase-F passed after retrying a transient registry-rate-limited backup/restore probe. Those passes are not exact-head proof for d9020f76bf62a095db16aed6a340831812480567.

The earlier strict real-source matrix was 12/48; thirty archetypes had no eligible source and six candidates had no canonical rows. The canonical anchor repair addresses the latter linkage bug only; the missing-source cases remain blocked. Production SHA still needs fresh readback and browser proof.

## Next action

Promote this documented checkpoint and re-run the exact-head gates. Confirm the isolated CLI step succeeds, inspect the fresh source matrix, and retain all 48/48 and evidence-boundary rules. Do not merge or claim product completion until the full product path and production provenance are proven.
