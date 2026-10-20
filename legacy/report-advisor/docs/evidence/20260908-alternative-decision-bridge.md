# Alternative → Decision bridge — 2026-09-08

## Implemented

- Added a tenant-safe `get_alternative_item_groups(integer)` read boundary.
- The function is `SECURITY INVOKER`, requires `current_company_id()`, and is executable by `authenticated` only.
- The read payload contains alternative-group metadata plus member SKU, conversion factor, and matching product metadata where available.
- Client-side `alternative-ranking.ts` ranks only persisted candidates. It does not invent stock, availability, demand, price, or margin.
- Learning is governed: fewer than 3 observed outcomes produces zero learning adjustment; qualified positive/negative signals are capped at +15%/-15%.

## Staging verification

- Migration `20260908230000_alternative_ranking_read_model` applied successfully to Staging project `fnqbvfuwbdpwvhcgzksl`.
- Function catalog verification: `get_alternative_item_groups(integer)` exists, `SECURITY DEFINER=false`, `anon EXECUTE=false`, `authenticated EXECUTE=true`, and the function definition contains `current_company_id()`.
- Direct SQL invocation without an authenticated tenant returned `TENANT_REQUIRED`. This is expected and is evidence that the boundary does not silently fall back to an arbitrary tenant.

## Remaining boundary

Authenticated browser/E2E execution has not been certified in this batch. The next integration point is the Decision Experience UI, where the ranked alternatives must be presented as decision evidence without bypassing approval or evidence gates.

No production alias, frozen RC, or release certification state was mutated.
