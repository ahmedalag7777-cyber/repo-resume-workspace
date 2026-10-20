-- RLS policy dependency reconciliation.
-- public.current_company_id() is intentionally SECURITY DEFINER and is used
-- directly by authenticated RLS policies. Authenticated callers therefore
-- require EXECUTE on this helper; anon must remain excluded.

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon;
