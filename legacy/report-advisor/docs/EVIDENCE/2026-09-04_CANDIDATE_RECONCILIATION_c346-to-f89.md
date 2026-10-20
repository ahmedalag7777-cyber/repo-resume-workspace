# Exact Candidate Reconciliation — c346e23 → f89dbc05

**Date:** 2026-09-04
**Repository:** `Report-Engainall/Report-Advisor`
**Base:** `c346e23a64d96125264fae849964b60b0f96c15f`
**Head:** `f89dbc05e9e392ee2d549fec15108add55708392`

## Boundary result

GitHub ancestry comparison proves the head is **36 commits ahead, 0 behind**, with `c346e23...` as the merge base. Therefore the previous index statement that `c346e23...` was the current code/test candidate was stale. The 36-commit interval is classified below by commit intent and observed changed-file surface.

## 36-commit forensic classification

| # | SHA | Commit | Classification | Candidate impact |
|---:|---|---|---|---|
| 1 | `d96f095a9099344baea3c11931123815b221f43f` | docs(index): synchronize latest closure and live truth | GOVERNANCE/DOCS | none |
| 2 | `fc78bfb04e14e07fbab03ad01eb4f351b202409f` | fix(security): lock autonomy SECURITY DEFINER search paths | SECURITY / MIGRATION | code/security candidate mutation |
| 3 | `a47e9ddff0463c3232afd89155ec3b24b620603e` | docs(index): add compact current execution table | GOVERNANCE/DOCS | none |
| 4 | `8cfaf6e8d11f5facc6f5bd047f48210290a23959` | security: require active membership for decision work-item assignees | SECURITY / MIGRATION | code/security candidate mutation |
| 5 | `a85038425c0ccb75ca8cc01404ce1c9d76693403` | docs: update execution table for active-assignee hardening | GOVERNANCE/DOCS | none |
| 6 | `0ab9d8b9ea8acc779e80818354ac502c99e86d85` | fix: persist recommendation outcome provenance hardening | SECURITY / MIGRATION | code/security candidate mutation |
| 7 | `cde5f37bff56c65b51dc26223dedc655854b52d3` | revert: remove malformed recommendation outcome migration | CODE/MIGRATION REVERT | candidate mutation; net state must be evaluated at head |
| 8 | `afaf25baaf1643e616d64a25de297015ef6caf4f` | fix: preserve recommendation outcome validation contract | CODE/MIGRATION | candidate mutation |
| 9 | `b98ad7f7c32f27b48e58382576c332ed0ebf0312` | fix: require decision provenance for decision-key outcomes | CODE/MIGRATION | candidate mutation |
| 10 | `d97db6ad6cf5af2d74c11ea08f208a649751b0ae` | test: align index-boundary adversarial assertions with validator error | TEST/GOVERNANCE | candidate test mutation |
| 11 | `a274572134c2da78929ad35c5f56ac321a79f870` | fix: close linked recommendation outcome provenance gap | CODE/MIGRATION | candidate mutation |
| 12 | `6a8e51bfbef0bbf17d32d0840e363b7a482dc8dc` | test(enforcement): align adversarial index-head cases with real git ancestry | TEST/GOVERNANCE | candidate test mutation |
| 13 | `c6499a2888e1b7139dad5475c95c304eb2726af2` | fix(enforcement): enforce index-only changed-file boundary | WORKFLOW/GOVERNANCE CODE | candidate checker mutation |
| 14 | `c5beb8119d0adc991a28f9ebd8ce0edcca7b6803` | chore(supabase): reconcile remote migration history | MIGRATION GOVERNANCE | migration-lineage mutation |
| 15 | `f9cdbcfac3b990aaeb8791c60fdcbc5f7843d05f` | chore(supabase): reconcile remote migration history | MIGRATION GOVERNANCE | migration-lineage mutation |
| 16 | `bc382168d2dd3f72000e7cdd63cc65a0b924cbd6` | chore(supabase): reconcile remote migration history | MIGRATION GOVERNANCE | migration-lineage mutation |
| 17 | `02b6520ab3e17c4c86c7c090e5c3d8da294ce083` | chore(supabase): reconcile remote migration history | MIGRATION GOVERNANCE | migration-lineage mutation |
| 18 | `e6f27cf5885acc6bb1e29e4cd977e274bad08f16` | fix(queries): bound compatibility import history reads | COMPATIBILITY/CODE | candidate mutation |
| 19 | `0fa2e6970c5203ca6a36dd7e076162d48a0488c5` | test(import): cover compatibility query bounds | TEST | candidate test mutation |
| 20 | `0e177ed6a8e736ac63abefd0cc7d50af77bc2706` | docs(index): publish 2026-09-04 deep forensic rescan | GOVERNANCE/DOCS | none |
| 21 | `92d12fb3bc7d2c57eb3e6eb25809e904392e7456` | docs(index): synchronize current execution table after deep rescan | GOVERNANCE/DOCS | none |
| 22 | `c2824cc8dac9677bb3859617d1298c7a38c72351` | docs(evidence): record deep forensic rescan and 30h closure ledger | EVIDENCE/DOCS | none |
| 23 | `5642040e558e0a78c3befb7a14c853b341f669e2` | docs(index): synchronize exact repository head and 30h closure status | GOVERNANCE/DOCS | none |
| 24 | `cc10c0eb153c48abcfcff2c22983543e96ee3e76` | docs(governance): update execution debt and release velocity after deep rescan | GOVERNANCE/DOCS | none |
| 25 | `1264cf360ae81af9ab59ec9866526eca0a2eec51` | docs(index): advance current repository head after governance ledger update | GOVERNANCE/DOCS | none |
| 26 | `797c19d7417742cc68c470c437bafd39bcaeedcb` | docs(index): record active closure execution session | GOVERNANCE/DOCS | none |
| 27 | `8ce2a7f841669f9dca8beacd352c50b290040983` | test(security): codify approval authority contract | SECURITY TEST | candidate test mutation |
| 28 | `bc1218edbd5444fe5626ff86cb255bbfb872481f` | docs(index): record RBAC authority forensic closure | GOVERNANCE/DOCS | none |
| 29 | `fe1d73db438f4a9632fe414de38d58087ebc356b` | test(certification): add exact-SHA provenance adversarial contract | CERTIFICATION TEST | candidate test mutation |
| 30 | `20792e48157b22103050d50a907e1bf8150dcb3e` | ci(certification): bind certification evidence to exact checked-out SHA | CERTIFICATION WORKFLOW | candidate workflow mutation |
| 31 | `7f9a4442e52e3c744d07ab438f39dad3a91ee876` | governance(certification): add executable exact-boundary anti-bypass gate | CERTIFICATION CODE | candidate governance/checker mutation |
| 32 | `a1596525505f389dcf227cc439da79148cf43718` | test(certification): add anti-bypass boundary test-of-test | CERTIFICATION TEST | candidate test mutation |
| 33 | `c89697a762faac3329d5509548b17a23a822a42e` | test(certification): make boundary test-of-test use real git ancestry | CERTIFICATION TEST | candidate test mutation |
| 34 | `7b97dfec32ebe270c7e3ca7c43bffe3578355f0f` | ci(governance): enforce exact certification boundary before execution gates | CERTIFICATION WORKFLOW | candidate workflow mutation |
| 35 | `3a7ae75087e8c705a5578e17e907f7c5b1c41f70` | ci(certification): enforce boundary gate and provenance test-of-test | CERTIFICATION WORKFLOW/TEST | candidate mutation |
| 36 | `f89dbc05e9e392ee2d549fec15108add55708392` | fix(governance): parse established Master Index candidate wording | CERTIFICATION GOVERNANCE CODE | candidate checker mutation |

## Determination

The **CURRENT_CODE_TEST_CANDIDATE is `f89dbc05e9e392ee2d549fec15108add55708392`**.

Reason: although several commits are documentation-only, the interval contains genuine code, migration, test, compatibility, and certification-workflow mutations, and the final commit itself changes executable certification-boundary parsing. It is therefore incorrect to select `c346e23...`, `0fa2e...`, or another earlier SHA as the current candidate merely because later commits look mostly like governance. The correct candidate is the latest ancestor that contains the complete executable product/test/certification state: `f89dbc...`.

## Exact-head rule for subsequent index synchronization

Any later documentation/evidence-only synchronization commit must leave `f89dbc...` as `CURRENT_CODE_TEST_CANDIDATE`. The later synchronization SHA is a repository/index boundary, not a new product candidate, unless it contains a real code/test/workflow/migration mutation.

## Certification implication

No historical CI/runtime evidence is promoted. Fresh required checks must consume `f89dbc...` directly or a governed index-only descendant whose certification workflow explicitly resolves and checks out `f89dbc...`, then verifies `HEAD == CERTIFICATION_SHA` before tests/evidence are accepted.
