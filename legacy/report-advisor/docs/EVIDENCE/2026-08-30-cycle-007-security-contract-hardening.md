# Report-Advisor — Cycle 007 Evidence

Date: 2026-08-30
Repository: Report-Engainall/Report-Advisor
Resulting main HEAD: bb66aef667205bb9c3af832d6e121391e2b67ab9

## Real work

- Audited PR #155 security contract for `update_recommendation_status(uuid,text)`.
- Found a test weakness: the guard matched revoke text anywhere in SQL and only checked RPC-name presence in wrappers.
- Strengthened the guard to:
  - strip SQL/JS comments before assertions;
  - require an executable `REVOKE ALL ON FUNCTION public.update_recommendation_status(uuid,text) FROM PUBLIC, anon, authenticated;`;
  - require both compatibility wrappers to call `supabase.rpc('update_recommendation_status', ...)` with `p_recommendation_id: id` and `p_status: status`.
- Commit on PR branch: `258e4e66efc61528c8155f8e8abebde89d956864`.
- PR #155 squash-merged into main: `bb66aef667205bb9c3af832d6e121391e2b67ab9`.

## Exact-head CI evidence for the hardened PR commit

All specialized gates and canonical quality completed SUCCESS on `258e4e66efc61528c8155f8e8abebde89d956864`, including:

- quality run `33294572347`
- desktop-windows run `33294572391`
- decision-dml-boundary run `33294572378`
- security-definer-helper-contract run `33294572364`
- recommendation-outcome-dml-boundary run `33294572343`
- production-chain-guard run `33294572358`
- file-intelligence-security run `33294572352`
- integrity-batch run `33294572385`
- batch-integrity-guards run `33294572360`
- company-context-contract run `33294572367`
- semantic-metric-runtime-contract run `33294572366`
- metric-governance-rls-contract run `33294572388`
- work-item-completion-gate run `33294572394`
- file-engine-header-contract run `33294572382`
- ci-bootstrap-smoke run `33294572432`

Windows run #126 completed SUCCESS for that exact PR commit.

## Security rescan

Live Supabase security advisor was re-read after the change.

Current WARN families include intended authenticated SECURITY DEFINER lifecycle RPCs such as decision/work-item creation, approval, outcome, and alert operations. These were not blindly revoked because repository consumers and lifecycle contracts exist and their purpose is privileged tenant-scoped execution.

The advisor also reports `public.companies` as RLS-enabled with no policy (INFO), and leaked-password protection disabled (WARN). The latter is an external Auth configuration item and is not silently claimed fixed.

## Deployment boundary

Vercel produced a READY preview deployment for PR #155 commit `258e4e66efc61528c8155f8e8abebde89d956864`. The deployment was not treated as production certification. The Hobby account reported the production deployment quota limitation separately.

## Certification discipline

This evidence does NOT promote historical runtime/LIVE/production certification to main. Current main exact-head runtime/deployment proof must be refreshed independently after the merge.

Production certified: NO.
