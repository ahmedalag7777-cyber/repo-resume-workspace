-- Authentication binding for the Phase-L production runtime surface.
-- Keep all SECURITY DEFINER helpers inaccessible to anonymous/public callers
-- while allowing authenticated tenant-scoped execution only.
REVOKE ALL ON FUNCTION public.can_run_phase_l_autonomy(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_run_phase_l_autonomy(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_run_phase_l_autonomy(text) TO authenticated;

REVOKE ALL ON FUNCTION public.phase_l_production_autonomy_health() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase_l_production_autonomy_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.phase_l_production_autonomy_health() TO authenticated;
