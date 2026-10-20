-- Restore the authenticated RPC execution grant required by the browser tenant resolver.
-- This is a forward-only privilege correction; no historical migration is rewritten.

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon;
