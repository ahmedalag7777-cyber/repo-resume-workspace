# CYCLE-015 — Current-main data-quality truth closure

Date: 2026-08-30

## Exact heads
- Start main: `a705f9c5b8b161418337d932a27b3029071d39f2`
- Integration branch: `cycle-015/data-quality-empty-runtime-truth-main`
- Current branch head: `87026f40d649bc7c2182e1d5dc13d74062b7e905`
- PR: #196

## Finding
Live Supabase `get_data_quality_snapshot()` was still returning `status='OK'`, populated zero-row entities, and 100 scores for an empty commercial corpus. The live definition was SECURITY INVOKER, tenant-authoritative, anonymous EXECUTE denied, but the EMPTY semantic fix was not yet applied to the live database.

## Fix executed
1. Added a validated runtime adapter with explicit `OK | EMPTY` semantics.
2. Preserved the existing browser adapter path by delegating `src/lib/data-quality-snapshot.ts` to the validated runtime adapter.
3. Changed zero-record UI scoring to `0`, never `100`.
4. Changed canonical RPC output to `EMPTY` with empty entity/issue arrays when all commercial source totals are zero.
5. Bounded entity quality scores to `[0,100]`.
6. Preserved aggregate issue counts even when multiple independent findings exceed the entity row count; validator no longer treats that as invalid truth.
7. Added executable contract and behavioral/test-of-test coverage plus a focused CI workflow.
8. Closed stale PR #195 as superseded by current-main PR #196.

## Live verification
Applied migration `fix_empty_data_quality_truth_current_main` to Supabase project `fnqbvfuwbdpwvhcgzksl`.

Post-mutation verification:
- `security_definer = false`
- anonymous EXECUTE = false
- authenticated EXECUTE = true
- EMPTY status branch present
- EMPTY arrays branch present
- score bounds present
- public tables with RLS: `78/78`
- public SECURITY DEFINER functions: `22`; anon execute `0`; PUBLIC execute `0`
- SECURITY DEFINER functions without explicit search_path: `0`
- core business corpus remains empty: customers/products/sales/purchases/inventory/recommendations/decision work items/outcomes all `0`

## Runtime boundary
Authenticated RPC execution and browser E2E remain unproven because the available session lacks governed authenticated test identities/corpus. No production certification claim is made.

## Deployment
Current Vercel production `/login` is HTTP 200, but the observed READY deployment is bound to an older SHA (`fc4230f...` for PR #195), not current main `a705f9c...` or PR #196. Exact-current-HEAD deployment binding remains open.
