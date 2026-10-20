-- Trigger-only Evidence Passport enforcement functions are internal database hooks.
-- They must not be callable through the public RPC surface.
REVOKE ALL ON FUNCTION public.enforce_source_decision_evidence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_source_recommendation_evidence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_source_work_item_evidence() FROM PUBLIC;
