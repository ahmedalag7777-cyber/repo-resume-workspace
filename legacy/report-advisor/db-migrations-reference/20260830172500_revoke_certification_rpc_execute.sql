-- Production certification is an internal release decision boundary.
-- It must never be callable through PostgREST by anonymous or tenant users.
REVOKE EXECUTE ON FUNCTION public.can_release_production_certification(text) FROM PUBLIC, anon, authenticated;
