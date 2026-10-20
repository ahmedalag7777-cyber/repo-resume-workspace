-- Phase L production autonomy runtime compatibility boundary.
-- The canonical Phase L objects are created by the preceding reconcile migration.
-- This migration preserves that runtime contract while exposing the stable guard
-- identifier consumed by certification and downstream callers.

REVOKE ALL ON TABLE public.control_plane_health_snapshots FROM anon;
DROP POLICY IF EXISTS control_plane_health_snapshots_tenant ON public.control_plane_health_snapshots;
CREATE POLICY control_plane_health_snapshots_tenant
  ON public.control_plane_health_snapshots
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

REVOKE ALL ON TABLE public.executive_evidence_graph FROM anon;
DROP POLICY IF EXISTS executive_evidence_graph_tenant ON public.executive_evidence_graph;
CREATE POLICY executive_evidence_graph_tenant
  ON public.executive_evidence_graph
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

REVOKE ALL ON TABLE public.autonomy_certification_evidence FROM anon;
DROP POLICY IF EXISTS autonomy_certification_evidence_tenant ON public.autonomy_certification_evidence;
CREATE POLICY autonomy_certification_evidence_tenant
  ON public.autonomy_certification_evidence
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

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
