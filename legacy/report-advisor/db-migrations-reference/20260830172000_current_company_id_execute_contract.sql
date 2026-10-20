-- Phase 1/2 foundation + security closure:
-- current_company_id() is the canonical tenant authority used by the browser and
-- authenticated SQL functions. Keep it unavailable to anonymous callers while
-- explicitly granting authenticated EXECUTE on the SECURITY DEFINER helper.

REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
