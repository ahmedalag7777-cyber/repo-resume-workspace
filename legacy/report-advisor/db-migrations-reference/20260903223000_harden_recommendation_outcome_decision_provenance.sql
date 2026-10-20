-- Harden recommendation outcome provenance while preserving the existing
-- evidence, status, quality, tenant, and idempotency contract.
CREATE OR REPLACE FUNCTION public.record_recommendation_outcome(
  p_recommendation_key text,
  p_observed_at timestamp with time zone,
  p_expected_impact numeric DEFAULT NULL::numeric,
  p_actual_impact numeric DEFAULT NULL::numeric,
  p_outcome_quality numeric DEFAULT NULL::numeric,
  p_status text DEFAULT 'insufficient'::text,
  p_decision_id uuid DEFAULT NULL::uuid,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_id uuid;
  v_evidence_snapshot_id text := NULLIF(btrim(COALESCE(p_evidence->>'evidence_snapshot_id','')), '');
  v_recommendation_id uuid;
  v_decision_from_key uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_recommendation_key IS NULL OR btrim(p_recommendation_key) = '' OR p_observed_at IS NULL THEN RAISE EXCEPTION 'OUTCOME_IDENTITY_INCOMPLETE'; END IF;

  SELECT r.id, r.decision_id INTO v_recommendation_id, v_decision_from_key
  FROM public.recommendations r
  WHERE r.id::text = p_recommendation_key AND r.company_id = v_company;

  IF v_recommendation_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.business_intelligence_decisions d
    WHERE d.decision_key = p_recommendation_key AND d.company_id = v_company
  ) THEN
    RAISE EXCEPTION 'OUTCOME_PROVENANCE_NOT_FOUND';
  END IF;

  IF p_decision_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.business_intelligence_decisions d
      WHERE d.id = p_decision_id AND d.company_id = v_company
    ) THEN
      RAISE EXCEPTION 'DECISION_NOT_FOUND_OR_FORBIDDEN';
    END IF;
    IF v_recommendation_id IS NOT NULL AND v_decision_from_key IS DISTINCT FROM p_decision_id THEN
      RAISE EXCEPTION 'RECOMMENDATION_DECISION_MISMATCH';
    END IF;
    IF v_recommendation_id IS NULL AND NOT EXISTS (
      SELECT 1 FROM public.business_intelligence_decisions d
      WHERE d.id = p_decision_id AND d.decision_key = p_recommendation_key AND d.company_id = v_company
    ) THEN
      RAISE EXCEPTION 'DECISION_KEY_MISMATCH';
    END IF;
  END IF;

  IF v_evidence_snapshot_id IS NULL THEN RAISE EXCEPTION 'OUTCOME_EVIDENCE_REQUIRED'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.kpi_evidence_snapshots s WHERE s.id::text=v_evidence_snapshot_id AND s.company_id=v_company)
    OR EXISTS (SELECT 1 FROM public.business_state_snapshots s WHERE s.id::text=v_evidence_snapshot_id AND s.company_id=v_company)
    OR EXISTS (SELECT 1 FROM public.import_snapshots s WHERE s.id::text=v_evidence_snapshot_id AND s.company_id=v_company)
    OR EXISTS (SELECT 1 FROM public.operational_health_snapshots s WHERE s.id::text=v_evidence_snapshot_id AND s.company_id=v_company)
    OR EXISTS (SELECT 1 FROM public.decision_action_receipts r WHERE r.id::text=v_evidence_snapshot_id AND r.company_id=v_company AND r.status IN ('SUCCEEDED','RUNNING'))
  ) THEN RAISE EXCEPTION 'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN'; END IF;
  IF p_status NOT IN ('positive','negative','neutral','insufficient') THEN RAISE EXCEPTION 'INVALID_OUTCOME_STATUS'; END IF;
  IF p_status IN ('positive','negative','neutral') AND (p_expected_impact IS NULL OR p_actual_impact IS NULL) THEN RAISE EXCEPTION 'OUTCOME_VALUES_REQUIRED_FOR_KNOWN_STATUS'; END IF;
  IF p_outcome_quality IS NOT NULL AND (p_outcome_quality < 0 OR p_outcome_quality > 1) THEN RAISE EXCEPTION 'OUTCOME_QUALITY_OUT_OF_RANGE'; END IF;

  INSERT INTO public.recommendation_outcomes(company_id,recommendation_key,decision_id,observed_at,expected_impact,actual_impact,outcome_quality,status,evidence)
  VALUES(v_company,p_recommendation_key,p_decision_id,p_observed_at,p_expected_impact,p_actual_impact,p_outcome_quality,p_status,COALESCE(p_evidence,'{}'::jsonb))
  ON CONFLICT(company_id,recommendation_key) DO UPDATE SET decision_id=EXCLUDED.decision_id,observed_at=EXCLUDED.observed_at,expected_impact=EXCLUDED.expected_impact,actual_impact=EXCLUDED.actual_impact,outcome_quality=EXCLUDED.outcome_quality,status=EXCLUDED.status,evidence=EXCLUDED.evidence
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
