# Master Execution Index — Append 2026-08-30 / Cycle 004

## Exact lineage
- Start HEAD: `b63e641cd7f0228633a56b048e723314b53b01a0`
- Current HEAD: `bbce1d7bed7aedecd875b125e123c7832b400c83`

## Real execution
- Merged #139: enforce a single active default company membership.
- Merged #140: execute semantic metric registry validation at runtime in CI.
- Merged #141: harden Windows watcher event-to-ingestion handoff and activate current-main Windows verification.
- Merged #142: restrict authenticated EXECUTE on six internal SECURITY DEFINER tenant/trust helper functions.
- Merged #144: restore `IN_PROGRESS` as a hard prerequisite for work-item completion.
- Merged #145: remove two duplicate company-membership index pairs introduced by the default-membership hardening.
- Merged #146: preserve unknown dashboard customer/product/invoice counts as `null` instead of coercing missing values to zero.

## Runtime evidence
- Staging confirmed the active-default uniqueness invariant rejects a second active default membership; transaction residue: `0`.
- Staging confirmed the six helper functions no longer grant EXECUTE to `authenticated`.
- Staging adversarial lifecycle test confirmed an `OPEN` work item is rejected by `complete_decision_work_item` with `WORK_ITEM_NOT_EXECUTABLE`; transaction residue: `0`.
- Staging performance advisor rescanned after duplicate-index cleanup; duplicate-index warnings for `company_memberships` are gone.

## Deferred / not certified
- Production was not mutated.
- Windows runtime proof remains dependent on an actual Windows Actions execution; repository wiring is integrated but no runtime certification is claimed from static checks.
- Vercel live access remains externally blocked by the connected scope returning `403 Forbidden`; no repeated retry was performed.
- GitHub connector returned no workflow runs for the resulting merge commits; this is not treated as CI PASS.

## Rule
This append is evidence-only and does not promote any historical PASS into production certification.
