-- Phase J: autonomous business control plane foundation, evidence-first and constraint-aware.
CREATE TABLE IF NOT EXISTS business_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_key text NOT NULL, observed_at timestamptz NOT NULL DEFAULT now(), source_version text NOT NULL,
  sales jsonb NOT NULL DEFAULT '{}'::jsonb, demand jsonb NOT NULL DEFAULT '{}'::jsonb, inventory jsonb NOT NULL DEFAULT '{}'::jsonb,
  liquidity jsonb NOT NULL DEFAULT '{}'::jsonb, operations jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 1), evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id,snapshot_key)
);
CREATE INDEX IF NOT EXISTS idx_business_state_latest ON business_state_snapshots(company_id,observed_at DESC);

CREATE TABLE IF NOT EXISTS control_plane_optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_key text NOT NULL, state_snapshot_id uuid REFERENCES business_state_snapshots(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('proposed','approved','executed','blocked','rolled_back','failed')),
  objective text NOT NULL, constraints jsonb NOT NULL DEFAULT '{}'::jsonb, solution jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_budget numeric, liquidity_reserved numeric, service_level_target numeric, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  UNIQUE(company_id,run_key)
);

CREATE TABLE IF NOT EXISTS recommendation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recommendation_key text NOT NULL, decision_id uuid, observed_at timestamptz NOT NULL DEFAULT now(),
  expected_impact numeric, actual_impact numeric, outcome_quality numeric CHECK (outcome_quality >= 0 AND outcome_quality <= 1),
  status text NOT NULL CHECK (status IN ('pending','positive','neutral','negative','insufficient')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id,recommendation_key)
);

CREATE TABLE IF NOT EXISTS executive_kpi_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kpi_key text NOT NULL, observed_at timestamptz NOT NULL DEFAULT now(), value numeric NOT NULL,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb, transformation_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_hash text NOT NULL, quality text NOT NULL CHECK (quality IN ('verified','estimated','insufficient')),
  UNIQUE(company_id,kpi_key,observed_at)
);

CREATE TABLE IF NOT EXISTS control_plane_drift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  drift_key text NOT NULL, domain text NOT NULL, severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL CHECK (status IN ('open','acknowledged','mitigated','resolved','blocked')) DEFAULT 'open',
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb, observed jsonb NOT NULL DEFAULT '{}'::jsonb, deviation numeric,
  detected_at timestamptz NOT NULL DEFAULT now(), evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(company_id,drift_key)
);

ALTER TABLE business_state_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_plane_optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_kpi_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_plane_drift_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE business_state_snapshots,control_plane_optimization_runs,recommendation_outcomes,executive_kpi_lineage,control_plane_drift_events FROM anon;
CREATE POLICY business_state_tenant ON business_state_snapshots FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id());
CREATE POLICY control_optimization_tenant ON control_plane_optimization_runs FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id());
CREATE POLICY recommendation_outcome_tenant ON recommendation_outcomes FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id());
CREATE POLICY executive_kpi_lineage_tenant ON executive_kpi_lineage FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id());
CREATE POLICY control_drift_tenant ON control_plane_drift_events FOR ALL TO authenticated USING(company_id=public.current_company_id()) WITH CHECK(company_id=public.current_company_id());

CREATE OR REPLACE FUNCTION public.can_execute_control_plane_run(p_run_key text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(
    SELECT 1 FROM control_plane_optimization_runs r
    WHERE r.company_id=public.current_company_id() AND r.run_key=p_run_key AND r.status='approved'
      AND r.risk_budget IS NOT NULL AND r.risk_budget >= 0
      AND r.liquidity_reserved IS NOT NULL AND r.liquidity_reserved >= 0
      AND r.service_level_target IS NOT NULL AND r.service_level_target >= 0
      AND jsonb_typeof(r.evidence)='object'
      AND jsonb_typeof(r.evidence->'source_refs')='array'
      AND jsonb_array_length(r.evidence->'source_refs') > 0
  )
  AND public.is_continuous_trust_healthy('production')
  AND NOT EXISTS(SELECT 1 FROM control_plane_drift_events d WHERE d.company_id=public.current_company_id() AND d.status IN ('open','blocked') AND d.severity='critical');
$$;
GRANT EXECUTE ON FUNCTION public.can_execute_control_plane_run(text) TO authenticated;
