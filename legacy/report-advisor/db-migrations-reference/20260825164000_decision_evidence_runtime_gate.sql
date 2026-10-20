-- Evidence-first decision/runtime hardening.
-- Reuses existing governance, risk-budget, business-state and outcome primitives.
-- No new engine or parallel decision path is introduced.

CREATE OR REPLACE FUNCTION public.can_execute_bi_decision(p_decision_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM business_intelligence_decisions d
    JOIN governance_policies p
      ON p.company_id=d.company_id
     AND p.policy_key=d.policy_key
     AND p.status='active'
     AND p.effective_at <= now()
     AND (p.expires_at IS NULL OR p.expires_at > now())
    JOIN business_risk_budgets b
      ON b.company_id=d.company_id
     AND b.domain=d.decision_type
     AND b.status='active'
     AND b.consumed_risk < b.max_risk
    WHERE d.company_id=public.current_company_id()
      AND d.decision_key=p_decision_key
      AND d.status='APPROVED'
      AND d.confidence IS NOT NULL
      AND d.confidence >= 0.80
      AND jsonb_typeof(d.evidence)='object'
      AND jsonb_typeof(d.evidence->'source_refs')='array'
      AND jsonb_array_length(d.evidence->'source_refs') > 0
      AND jsonb_typeof(d.evidence->'observed_at')='string'
      AND NULLIF(trim(d.evidence->>'observed_at'),'') IS NOT NULL
  )
  AND public.is_continuous_trust_healthy('production');
$$;

CREATE OR REPLACE FUNCTION public.can_execute_control_plane_run(p_run_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM control_plane_optimization_runs r
    JOIN business_state_snapshots s
      ON s.id=r.state_snapshot_id
     AND s.company_id=r.company_id
     AND s.quality_score IS NOT NULL
     AND s.quality_score >= 0.80
     AND s.observed_at <= now()
     AND NULLIF(trim(s.source_version),'') IS NOT NULL
     AND jsonb_typeof(s.evidence)='object'
     AND jsonb_typeof(s.evidence->'source_refs')='array'
     AND jsonb_array_length(s.evidence->'source_refs') > 0
    WHERE r.company_id=public.current_company_id()
      AND r.run_key=p_run_key
      AND r.status='approved'
      AND r.risk_budget IS NOT NULL
      AND r.risk_budget >= 0
      AND jsonb_typeof(r.evidence)='object'
      AND jsonb_typeof(r.evidence->'source_refs')='array'
      AND jsonb_array_length(r.evidence->'source_refs') > 0
  )
  AND public.is_continuous_trust_healthy('production')
  AND NOT EXISTS (
    SELECT 1
    FROM control_plane_drift_events d
    WHERE d.company_id=public.current_company_id()
      AND d.status IN ('open','blocked')
      AND d.severity='critical'
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_execute_bi_decision(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_execute_control_plane_run(text) TO authenticated;
