# CYCLE-003 — lifecycle boundary + migration provenance extraction

Date: 2026-08-30
Start main SHA: `5fe4bf89134d26c88e9c1817efc2052399eb1d40`
Working branch latest: `0c93e45aa8600a403164a2d65f1eb3afc5f0608a`
Pull request: #106

## Before
- `src/lib/queries.ts` and `src/lib/queries-compat.ts` performed direct authenticated UPDATEs against `alerts` and `recommendations`.
- PR #98 contained the canonical lifecycle mutation change plus several post-baseline migration/security deltas, but its base was the older `4da16b9...` and it rewrote historical Master Index content. Direct merge was therefore unsafe and would reintroduce stale history.
- The live Supabase project already had `mark_alert_read(uuid)` and `update_recommendation_status(uuid,text)` as SECURITY DEFINER, fixed-search_path, authenticated-only RPC boundaries.
- Those two live RPC definitions were not present in the repository migration history.

## Actual engineering work
1. Created a fresh branch from the exact current main SHA.
2. Reused the current query architecture and changed only the two lifecycle adapters in each query surface from direct table UPDATE to the existing canonical RPC boundary.
3. Added `scripts/check-lifecycle-mutation-boundary.mjs` to reject direct lifecycle UPDATE bypasses in both adapters.
4. Initially added a dedicated workflow, then the topology gate exposed that a new workflow was not allowed by the repository's canonical CI topology. This was a real integration failure, not ignored.
5. Root cause: the new workflow expanded the workflow topology outside the existing governance surface. Fix: removed the redundant workflow and moved the lifecycle guard into the existing `batch-integrity-guards.yml` topology.
6. Mirrored the live canonical lifecycle RPC definitions into `20260830033000_canonical_lifecycle_mutation_rpc.sql`, including explicit PUBLIC/anon revocation and authenticated EXECUTE.
7. Extracted the unique migration/security SQL from PR #98 without importing its stale Master Index rewrite or duplicate Vercel configuration.
8. Created PR #106 for fresh exact-head CI review/merge rather than force-merging a diverged historical branch.

## Live proof used for the implementation decision
The live catalog reports:
- `mark_alert_read(p_alert_id uuid)`: SECURITY DEFINER, fixed `search_path=public`, anon EXECUTE=false, authenticated EXECUTE=true.
- `update_recommendation_status(p_recommendation_id uuid, p_status text)`: SECURITY DEFINER, fixed `search_path=public`, anon EXECUTE=false, authenticated EXECUTE=true.

The live definitions derive tenant authority from `current_company_id()` and reject missing/forbidden rows. The recommendation function validates the allowed lifecycle status set.

## PR #98 forensic disposition
- PR #98: `open`, `draft`, `mergeable=false`, head `96b409fac...`, base `4da16b9a...`.
- Current-main comparison: `main` is 26 commits ahead and PR #98 is 23 commits ahead of the common base.
- Unique useful delta extracted: lifecycle client boundary + lifecycle regression guard + post-baseline migration/security provenance files.
- Stale/unsafe delta not imported: historical Master Index replacement, duplicate `vercel.json`, and the unrelated package formatting-only expansion.

## Verification evidence
- Dedicated lifecycle guard run `33283562843` completed **SUCCESS** on the earlier branch head, proving the guard itself executes cleanly.
- Exact-head quality run `33283562809` reached the CI topology gate and failed there before downstream checks. The failure was treated as a regression, root-caused to the extra workflow, and corrected by moving the guard into the existing integrity workflow.
- A fresh exact-head CI run is required after the topology correction; no PASS is promoted from the pre-fix SHA.

## Certification rule
This cycle does not promote R1/R2/R3/R22 to certified. Exact-head CI after the topology fix, fresh migration replay, authenticated runtime, and production evidence remain separate requirements.
