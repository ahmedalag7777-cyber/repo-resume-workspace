-- Security hardening: lock remaining public SECURITY DEFINER autonomy helpers
-- to pg_catalog and schema-qualify all application relations.

CREATE OR REPLACE FUNCTION public.autonomy_runtime_gate(p_domain_key text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT jsonb_build_object(
    'domain', p_domain_key,
    'eligible', public.can_enter_phase_l_autonomy(p_domain_key),
    'health', public.compute_control_plane_health(),
    'trust_healthy', public.is_continuous_trust_healthy('production'),
    'critical_drift', EXISTS (
      SELECT 1 FROM public.control_plane_drift_events d
      WHERE d.company_id = public.current_company_id()
        AND d.severity IN ('high','critical')
        AND d.status IN ('open','blocked')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_enter_phase_l_autonomy(p_domain_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT public.can_certify_autonomous_domain(p_domain_key)
    AND public.compute_control_plane_health() >= .9
    AND NOT EXISTS (
      SELECT 1 FROM public.control_plane_drift_events
      WHERE company_id = public.current_company_id()
        AND severity IN ('high','critical')
        AND status IN ('open','blocked')
    );
$$;

CREATE OR REPLACE FUNCTION public.compute_control_plane_health()
RETURNS numeric LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog
AS $$
  WITH latest AS (
    SELECT
      COALESCE((SELECT quality_score FROM public.business_state_snapshots WHERE company_id=public.current_company_id() ORDER BY observed_at DESC LIMIT 1),0) AS data_score,
      COALESCE((SELECT AVG(CASE WHEN quality='verified' THEN 1 WHEN quality='estimated' THEN .7 ELSE 0 END) FROM public.executive_kpi_lineage WHERE company_id=public.current_company_id()),0) AS evidence_score,
      COALESCE((SELECT AVG(CASE WHEN status IN ('positive','neutral') THEN 1 WHEN status='negative' THEN .3 ELSE .5 END) FROM public.recommendation_outcomes WHERE company_id=public.current_company_id()),.5) AS decision_score,
      COALESCE((SELECT AVG(CASE WHEN status='completed' THEN 1 WHEN status IN ('blocked','failed') THEN 0 ELSE .5 END) FROM public.report_execution_jobs WHERE company_id=public.current_company_id()),.5) AS execution_score,
      (SELECT count(*) FROM public.control_plane_drift_events WHERE company_id=public.current_company_id() AND severity='critical' AND status IN ('open','blocked')) AS blockers
  )
  SELECT GREATEST(0,LEAST(1,((data_score+evidence_score+decision_score+execution_score)/4) - LEAST(.5,blockers*.1))) FROM latest;
$$;

ALTER FUNCTION public.autonomy_runtime_gate(text) SET search_path = pg_catalog;
ALTER FUNCTION public.can_enter_phase_l_autonomy(text) SET search_path = pg_catalog;
ALTER FUNCTION public.compute_control_plane_health() SET search_path = pg_catalog;
