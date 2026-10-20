-- The canonical application has no consumer for this RPC; recommendation
-- approval/execution is governed by the decision lifecycle. Keep this legacy
-- mutation boundary fail-closed until a deliberate replacement is introduced.
REVOKE ALL ON FUNCTION public.update_recommendation_status(uuid,text) FROM PUBLIC, anon, authenticated;
