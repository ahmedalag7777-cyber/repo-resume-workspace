# Master Execution Index — Batch 18 Current Snapshot — 2026-08-25

## Authoritative head
`main` advanced through Batch 18. The latest Batch 18 documentation commit is `f04ac4ea21e1e0e42b190ddc4df8117facab8ac8`.

## Tenant compatibility status
- `DataQualityPage` no longer owns or passes `COMPANY_ID`.
- Data Quality reads now go through `src/lib/data-quality-queries.ts` and rely on Supabase RLS/current tenant context.
- `scripts/check-tenant-legacy-consumers.mjs` now allows `COMPANY_ID`/`activeCompanyId` only in `src/lib/supabase.ts`.
- The compatibility owner in `src/lib/supabase.ts` remains intentionally retained until runtime/regression evidence proves it can be removed safely.

## Evidence classification
- Data Quality tenant refactor: `IMPLEMENTED / SOURCE-VERIFIED`.
- Legacy UI consumer boundary: `IMPLEMENTED / SOURCE-VERIFIED`.
- CI current-head runtime evidence: `UNKNOWN / NOT PROVEN`.
- Live two-tenant isolation: `NOT PROVEN`.
- Live migration state: `NOT PROVEN`.
- Production certification: `NOT CERTIFIED`.

## Recent commits
- `905066a2de85e604f4f97515733c0c07302aa12c` — tenant-native Data Quality query boundary.
- `cc8a81064e71fb922a8fd7153a5ba7c0f59a0453` — migrate Data Quality UI to the boundary.
- `4188b10ab1673c109fe9117a2f5eb9dca97aeaa3` — tighten tenant legacy consumer guard.
- `bbe3dffa54634d4b1da4b4f05d586ef61652ffb5` — Batch 18 delta.
- `f04ac4ea21e1e0e42b190ddc4df8117facab8ac8` — Batch 18 ledger.

## Next execution order
1. Run/verify tenant legacy audit and typecheck/build on the resulting HEAD.
2. Obtain executable CI evidence for the exact HEAD.
3. Add/execute two-tenant Data Quality isolation proof.
4. Inventory remaining compatibility references again.
5. Only after evidence, evaluate removal of `COMPANY_ID` compatibility owner.
6. Continue live migration verification, J/K/L/M runtime evidence, and E/F/H/I evidence.

## Non-negotiable rule
`IMPLEMENTED` is never upgraded to `RUNTIME-EVIDENCED` or `PRODUCTION-CERTIFIED` without executable evidence.
