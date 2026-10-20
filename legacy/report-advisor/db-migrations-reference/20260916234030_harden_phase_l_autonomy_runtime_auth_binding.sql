-- Harden the Phase L compatibility function with an explicit authenticated
-- tenant/user boundary so SECURITY DEFINER callers cannot execute it without
-- a resolved authenticated tenant context.

CREATE OR REPLACE FUNCTION public.can_run_phase_l_autonomy(p_domain_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.current_company_id() IS NOT NULL
    AND public.can_enter_phase_l_autonomy(p_domain_key)
    AND public.is_continuous_trust_healthy('production');
$$;

REVOKE ALL ON FUNCTION public.can_run_phase_l_autonomy(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_run_phase_l_autonomy(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.phase_l_production_autonomy_health()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'domain', p_domain_key,
    'can_run', public.can_run_phase_l_autonomy(p_domain_key),
    'tenant', public.current_company_id(),
    'trust_healthy', public.is_continuous_trust_healthy('production')
  )
  FROM (SELECT 'production'::text AS p_domain_key) s
  WHERE auth.uid() IS NOT NULL
    AND public.current_company_id() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.phase_l_production_autonomy_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase_l_production_autonomy_health() TO authenticated;
