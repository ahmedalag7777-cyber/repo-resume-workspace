-- CYCLE-016: close direct client-side recommendation_outcomes upsert.
-- Outcome persistence is now a tenant-authoritative RPC boundary.
-- Existing idempotent company/recommendation_key upsert semantics are preserved.

CREATE OR REPLACE FUNCTION public.record_recommendation_outcome(
  p_recommendation_key text,
  p_observed_at timestamptz,
  p_expected_impact numeric DEFAULT NULL,
  p_actual_impact numeric DEFAULT NULL,
  p_outcome_quality numeric DEFAULT NULL,
  p_status text DEFAULT 'insufficient',
  p_decision_id uuid DEFAULT NULL,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_recommendation_key IS NULL OR btrim(p_recommendation_key) = '' OR p_observed_at IS NULL THEN
    RAISE EXCEPTION 'OUTCOME_IDENTITY_INCOMPLETE';
  END IF;
  IF p_outcome_quality IS NOT NULL AND (p_outcome_quality < 0 OR p_outcome_quality > 1) THEN
    RAISE EXCEPTION 'OUTCOME_QUALITY_OUT_OF_RANGE';
  END IF;
  IF p_status NOT IN ('positive','negative','neutral','insufficient') THEN
    RAISE EXCEPTION 'INVALID_OUTCOME_STATUS';
  END IF;
  IF p_decision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.business_intelligence_decisions d
    WHERE d.id = p_decision_id AND d.company_id = v_company
  ) THEN
    RAISE EXCEPTION 'DECISION_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  INSERT INTO public.recommendation_outcomes(
    company_id, recommendation_key, decision_id, observed_at,
    expected_impact, actual_impact, outcome_quality, status, evidence
  ) VALUES (
    v_company, p_recommendation_key, p_decision_id, p_observed_at,
    p_expected_impact, p_actual_impact, p_outcome_quality,
    p_status, COALESCE(p_evidence,'{}'::jsonb)
  )
  ON CONFLICT(company_id, recommendation_key) DO UPDATE SET
    decision_id = EXCLUDED.decision_id,
    observed_at = EXCLUDED.observed_at,
    expected_impact = EXCLUDED.expected_impact,
    actual_impact = EXCLUDED.actual_impact,
    outcome_quality = EXCLUDED.outcome_quality,
    status = EXCLUDED.status,
    evidence = EXCLUDED.evidence
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.recommendation_outcomes FROM authenticated;
REVOKE ALL ON FUNCTION public.record_recommendation_outcome(text,timestamptz,numeric,numeric,numeric,text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_recommendation_outcome(text,timestamptz,numeric,numeric,numeric,text,uuid,jsonb) TO authenticated;
