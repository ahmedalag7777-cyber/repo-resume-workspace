-- Reconcile the repository with the live staging privilege boundary established by
-- the remote hardening migration `harden_direct_decision_work_item_insert_boundary`.
-- Direct authenticated INSERT is intentionally blocked; creation remains behind the
-- canonical decision-work-item runtime boundary.

REVOKE INSERT
ON TABLE public.decision_work_items
FROM authenticated;
