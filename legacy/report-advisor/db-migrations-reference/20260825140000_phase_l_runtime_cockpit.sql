-- Phase L runtime layer: executive evidence cockpit, control-plane health and certification evidence.
CREATE TABLE IF NOT EXISTS control_plane_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  overall_score numeric NOT NULL CHECK (overall_score BETWEEN 0 AND 1),
  evidence_score numeric NOT NULL CHECK (evidence_score BETWEEN 0 AND 1),
  data_quality_score numeric NOT NULL CHECK (data_quality_score BETWEEN 0 AND 1),
  forecast_score numeric NOT NULL CHECK (forecast_score BETWEEN 0 AND 1),
  decision_score numeric NOT NULL CHECK (decision_score BETWEEN 0 AND 1),
  trust_score numeric NOT NULL CHECK (trust_score BETWEEN 0 AND 1),
  critical_blocker_count integer NOT NULL DEFAULT 0 CHECK (critical_blocker_count >= 0),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id, observed_at)
);
CREATE INDEX IF NOT EXISTS idx_control_plane_health_latest ON control_plane_health_snapshots(company_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS executive_evidence_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_key text NOT NULL,
  target_type text NOT NULL,
  target_key text NOT NULL,
  relation text NOT NULL CHECK (relation IN ('supports','derived_from','contradicts','causes','measures','recommends','blocks')),
  weight numeric NOT NULL DEFAULT 1 CHECK (weight >= 0 AND weight <= 1),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,source_type,source_key,target_type,target_key,relation)
);
CREATE INDEX IF NOT EXISTS idx_executive_evidence_graph_target ON executive_evidence_graph(company_id,target_type,target_key);

CREATE TABLE IF NOT EXISTS autonomy_certification_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  certification_key text NOT NULL,
  gate_key text NOT NULL,
  passed boolean NOT NULL,
  measured_value numeric,
  threshold numeric,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,certification_key,gate_key)
);
CREATE INDEX IF NOT EXISTS idx_autonomy_certification_evidence ON autonomy_certification_evidence(company_id,certification_key,passed);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['control_plane_health_snapshots','executive_evidence_graph','autonomy_certification_evidence'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_tenant ON %I FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id())', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.compute_control_plane_health()
RETURNS numeric LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH latest AS (
    SELECT COALESCE((SELECT quality_score FROM business_state_snapshots WHERE company_id=public.current_company_id() ORDER BY observed_at DESC LIMIT 1),0) AS data_score,
           COALESCE((SELECT AVG(CASE WHEN quality='verified' THEN 1 WHEN quality='estimated' THEN .7 ELSE 0 END) FROM executive_kpi_lineage WHERE company_id=public.current_company_id()),0) AS evidence_score,
           COALESCE((SELECT AVG(CASE WHEN status IN ('positive','neutral') THEN 1 WHEN status='negative' THEN .3 ELSE .5 END) FROM recommendation_outcomes WHERE company_id=public.current_company_id()),.5) AS decision_score,
           COALESCE((SELECT AVG(CASE WHEN status='completed' THEN 1 WHEN status IN ('blocked','failed') THEN 0 ELSE .5 END) FROM report_execution_jobs WHERE company_id=public.current_company_id()),.5) AS execution_score,
           (SELECT count(*) FROM control_plane_drift_events WHERE company_id=public.current_company_id() AND severity='critical' AND status IN ('open','blocked')) AS blockers
  ) SELECT GREATEST(0,LEAST(1,((data_score+evidence_score+decision_score+execution_score)/4) - LEAST(.5,blockers*.1))) FROM latest;
$$;
GRANT EXECUTE ON FUNCTION public.compute_control_plane_health() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_enter_phase_l_autonomy(p_domain_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT public.can_certify_autonomous_domain(p_domain_key)
    AND public.compute_control_plane_health() >= .9
    AND NOT EXISTS (
      SELECT 1 FROM control_plane_drift_events
      WHERE company_id=public.current_company_id() AND severity IN ('high','critical') AND status IN ('open','blocked')
    );
$$;
GRANT EXECUTE ON FUNCTION public.can_enter_phase_l_autonomy(text) TO authenticated;
