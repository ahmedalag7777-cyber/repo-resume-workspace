# Execution report — 2026-10-12 — Canonical import anchor fix

- Repository: Report-Engainall/Report-Advisor
- Feature branch: fix/source-bound-generic-intelligence-20261009
- PR #912: open, not merged
- Code head: [d92737993e5a](https://github.com/Report-Engainall/Report-Advisor/commit/d92737993e5a295ff4341d122bcf11c8b774dc19)
- Product complete: **NO**
- Updated: 2026-10-12T17:12:03.445Z

## Root cause verified in the database

Report job `e4556a03-a683-4a82-9f89-21003f842119` for tenant `f68a7e91-3c7e-46fb-97a8-e339bec04e13` and source hash `sha256:00e609207bf2af96bc8d03089381d423d73085f23eeb2198f91eb5c5bf58f548` pointed at snapshot/import ID `0c6a6a22-c308-4bef-8ca9-55b29fa3bdf5`. Its import job was marked completed with 610 processed rows but `valid_rows=0`, and there are no canonical dataset rows under that import ID. The same tenant/hash has 610 actual canonical rows under import `88810977-7704-4b1d-b808-384a99c6d91d`.

Read-only SQL confirmed `canonical_import_commits` record `8da99f16-eaaf-407b-8d85-89ad87dbc870` has committed_count 610 and anchors first row `49f463c3-ee4c-446b-9412-1699de65ce94` to that successful import. The anchor row tenant and source hash exactly match the report context.

## Code correction

The preflight previously fetched canonical fields and rows only under `analysis.import_job_id`. It now queries canonical commits under the current company and exact SHA-256 hash, follows one of the persisted committed row IDs, reads that row under the same company + hash, and accepts the resolved import only when anchor ID/company/hash match. It uses that ID for canonical preview and source row selection. Matrix artifacts record both analysis and canonical import IDs and the anchor-resolution path.

Added tested pure helper functions to `scripts/real-source-provenance.mjs` and regressions in `scripts/real-source-provenance.test.mjs` for success and mismatch/rejection cases. Test-fixture source exclusions and minimum sample criteria are unchanged. No database writes were performed.

## Validation status

On predecessor head `717fcf2299f4cc8ef084eb120f3323410ba4cf79`: Build run [38281581629](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581629) PASS; Quality [38281581259](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581259) PASS; Handoff [38281581884](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581884) PASS; Data Quality [38281581638](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581638) PASS; Final Certification [38281581473](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581473) PASS; Phase-F [38281581295](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581295) PASS after retrying its failed registry-rate-limited backup/restore probe. The Full Product Browser E2E [38281581401](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38281581401) was in progress when last checked. These results do not certify the new code head `d92737993e5a295ff4341d122bcf11c8b774dc19`.

The previous strict matrix had 12/48 supported; 30 archetypes lacked an eligible real source and six selected candidates had empty canonical samples. This repair can correct import-to-canonical-row linkage; it cannot invent the missing real-source evidence. New exact-head matrix/browser/visual verification is pending.

## Next action

Validate the new regression and exact-head gates, then inspect the fresh 48-archetype artifact. Keep PR #912 open until genuine 48/48 eligible source proof and production parity/browser proof are demonstrated.
