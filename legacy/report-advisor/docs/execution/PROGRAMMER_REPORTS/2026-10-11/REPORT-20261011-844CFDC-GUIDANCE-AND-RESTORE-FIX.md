# Execution Report — 2026-10-11T19:21:00+03:00

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/source-bound-generic-intelligence-20261009`
- PR [#912](https://github.com/Report-Engainall/Report-Advisor/pull/912): OPEN / NOT MERGED.
- Exact code/test head: [`844cfdc20958ddc35908727c5511901844e4e5d7`](https://github.com/Report-Engainall/Report-Advisor/commit/844cfdc20958ddc35908727c5511901844e4e5d7).
- Main base: `fa1ab4cbade9b01685507aa966c10f700a03f576`.
- `PRODUCT_COMPLETE = NO`.

## Actual changes committed

1. Kept the existing universal and specialist intelligence engine. Generic intelligence still chooses canonical rows first, or a complete source-bound extraction snapshot only when actual and declared row counts agree. Partial and count-conflicting snapshots do not produce full-source intelligence.
2. Added visible `GUIDANCE` text in `src/components/ReportIntelligencePanel.tsx`, beside the Arabic source-intelligence heading. Before the patch this word existed only in `data-intelligence-contract-markers` and was absent from browser-visible text.
3. Changed logical restore `pg_dump` in `scripts/phase-f-live-resilience-probes.mjs` to pass `--exclude-table-data` for each `VOLATILE_RESTORE_TABLES` entry. This prevents the public-only dump from inserting carts whose `user_id` depends on `auth.users`, which is not included in the dump.
4. Added regression contracts in the intelligence-surface, resilience-runtime and backup/restore-contract scripts.

## Live test evidence

- Previous code head `9a17dd0`: [Build Gate 38154787842](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154787842) PASS; [Quality 38154787888](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154787888) PASS; [data-quality runtime 38154787868](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154787868) PASS.
- Current exact head `844cfdc20958ddc35908727c5511901844e4e5d7`: [Build Gate 38154988245](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154988245), [Quality 38154988352](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154988352), [data-quality runtime 38154988348](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154988348), and [Final Certification 38154988336](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154988336) were still running at capture.
- [Full Product Browser E2E 38154988368](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154988368) and [Phase-F Live Resilience 38154988385](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154988385) were pending.
- [Session Handoff 38154988297](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154988297) failed because the old checkpoint did not list five changed files. This archive now covers current head `844cfdc20958ddc35908727c5511901844e4e5d7`; exact-head handoff result is still required.
- Old real-browser proof [38153724487](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38153724487) confirms auth, source isolation, report persistence/readback/reload and Reports Center rows/source identity; fails at `executive: guidance section missing`. The UI fix is committed but new browser proof not yet available.
- Old Phase-F run [38154198486](https://github.com/Report-Engainall/Report-Advisor/actions/runs/38154198486) failed at restore with `carts_user_id_fkey`. The current fix is not yet validated live.
- PC01 offline; no local test/browser results claimed.

## Remaining

- Pass exact-head build, quality and handoff.
- Complete current-head Chromium flow through all source-bound screens and fresh upload/save/readback/refresh.
- Verify generic intelligence is shown for multiple file types, all collections/evidence stay source-bound, and specialty results are additive.
- Verify Phase-F restore is now successful.
- Separate remaining 48 archetype source coverage is not proven (diagnostic explicitly reported NOT_PROVEN).
- No production proof or PRODUCT_COMPLETE claim.

## Next action

Use exact-head GitHub workflow results to diagnose the first browser assertion or restore failure and prove the same reportJobId and SHA-256 across the full user journey.
