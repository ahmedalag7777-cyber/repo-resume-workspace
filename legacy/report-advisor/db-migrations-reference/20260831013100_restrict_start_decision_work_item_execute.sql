-- PUBLIC is a default privilege role in PostgreSQL. Revoke it explicitly so
-- the authenticated-only boundary is real, not merely an anon-role revoke.
REVOKE EXECUTE ON FUNCTION public.start_decision_work_item(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_decision_work_item(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_decision_work_item(uuid) TO authenticated;
