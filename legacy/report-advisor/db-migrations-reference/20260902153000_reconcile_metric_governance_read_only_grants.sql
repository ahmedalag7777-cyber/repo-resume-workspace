-- Reconcile the repository with the live staging privilege boundary established by
-- the remote hardening migration `harden_authenticated_read_only_grants_metric_governance`.
-- The live contract is authenticated read-only access; keep future environments aligned.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON TABLE public.metric_governance
FROM authenticated;
