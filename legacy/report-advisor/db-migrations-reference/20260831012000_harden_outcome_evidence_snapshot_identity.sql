-- Outcome writers must prove evidence snapshot identity, not merely accept a
-- non-empty caller-controlled snapshot string.

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
  v_evidence_snapshot_id text := NULLIF(btrim(COALESCE(p_evidence->>'evidence_snapshot_id','')), '');
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_recommendation_key IS NULL OR btrim(p_recommendation_key) = '' OR p_observed_at IS NULL THEN RAISE EXCEPTION 'OUTCOME_IDENTITY_INCOMPLETE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.recommendations r WHERE r.id::text = p_recommendation_key AND r.company_id = v_company)
     AND NOT EXISTS (SELECT 1 FROM public.business_intelligence_decisions d WHERE d.decision_key = p_recommendation_key AND d.company_id = v_company)
    THEN RAISE EXCEPTION 'OUTCOME_PROVENANCE_NOT_FOUND'; END IF;
  IF v_evidence_snapshot_id IS NULL THEN RAISE EXCEPTION 'OUTCOME_EVIDENCE_REQUIRED'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.kpi_evidence_snapshots s WHERE s.id::text = v_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.business_state_snapshots s WHERE s.id::text = v_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.import_snapshots s WHERE s.id::text = v_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.operational_health_snapshots s WHERE s.id::text = v_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.decision_action_receipts r WHERE r.id::text = v_evidence_snapshot_id AND r.company_id = v_company AND r.status IN ('SUCCEEDED','RUNNING'))
  ) THEN RAISE EXCEPTION 'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN'; END IF;
  IF p_status NOT IN ('positive','negative','neutral','insufficient') THEN RAISE EXCEPTION 'INVALID_OUTCOME_STATUS'; END IF;
  IF p_status IN ('positive','negative','neutral') AND (p_expected_impact IS NULL OR p_actual_impact IS NULL) THEN RAISE EXCEPTION 'OUTCOME_VALUES_REQUIRED_FOR_KNOWN_STATUS'; END IF;
  IF p_outcome_quality IS NOT NULL AND (p_outcome_quality < 0 OR p_outcome_quality > 1) THEN RAISE EXCEPTION 'OUTCOME_QUALITY_OUT_OF_RANGE'; END IF;
  IF p_decision_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.business_intelligence_decisions d WHERE d.id = p_decision_id AND d.company_id = v_company) THEN RAISE EXCEPTION 'DECISION_NOT_FOUND_OR_FORBIDDEN'; END IF;
  INSERT INTO public.recommendation_outcomes(company_id,recommendation_key,decision_id,observed_at,expected_impact,actual_impact,outcome_quality,status,evidence)
  VALUES(v_company,p_recommendation_key,p_decision_id,p_observed_at,p_expected_impact,p_actual_impact,p_outcome_quality,p_status,COALESCE(p_evidence,'{}'::jsonb))
  ON CONFLICT(company_id,recommendation_key) DO UPDATE SET decision_id=EXCLUDED.decision_id,observed_at=EXCLUDED.observed_at,expected_impact=EXCLUDED.expected_impact,actual_impact=EXCLUDED.actual_impact,outcome_quality=EXCLUDED.outcome_quality,status=EXCLUDED.status,evidence=EXCLUDED.evidence
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_decision_outcome(
  p_decision_fingerprint text,
  p_evidence_snapshot_id text,
  p_action_id text,
  p_observed_at timestamptz,
  p_label text,
  p_actual_value numeric DEFAULT NULL,
  p_expected_value numeric DEFAULT NULL,
  p_impact_value numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_id uuid;
BEGIN
  IF v_company IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_decision_fingerprint IS NULL OR btrim(p_decision_fingerprint) = '' OR p_evidence_snapshot_id IS NULL OR btrim(p_evidence_snapshot_id) = '' OR p_observed_at IS NULL THEN RAISE EXCEPTION 'OUTCOME_IDENTITY_INCOMPLETE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_intelligence_decisions d WHERE d.company_id = v_company AND d.decision_key = p_decision_fingerprint)
     AND NOT EXISTS (SELECT 1 FROM public.decision_action_receipts r WHERE r.company_id = v_company AND r.decision_fingerprint = p_decision_fingerprint)
    THEN RAISE EXCEPTION 'OUTCOME_PROVENANCE_NOT_FOUND'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.kpi_evidence_snapshots s WHERE s.id::text = p_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.business_state_snapshots s WHERE s.id::text = p_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.import_snapshots s WHERE s.id::text = p_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.operational_health_snapshots s WHERE s.id::text = p_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.decision_action_receipts r WHERE r.id::text = p_evidence_snapshot_id AND r.company_id = v_company AND r.status IN ('SUCCEEDED','RUNNING'))
  ) THEN RAISE EXCEPTION 'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN'; END IF;
  IF p_label NOT IN ('correct','incorrect','partial','unknown') THEN RAISE EXCEPTION 'INVALID_OUTCOME_LABEL'; END IF;
  INSERT INTO public.decision_outcomes(company_id,decision_fingerprint,evidence_snapshot_id,action_id,observed_at,label,actual_value,expected_value,impact_value,notes)
  VALUES(v_company,p_decision_fingerprint,p_evidence_snapshot_id,p_action_id,p_observed_at,p_label,p_actual_value,p_expected_value,p_impact_value,p_notes)
  ON CONFLICT(company_id,decision_fingerprint,observed_at) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'OUTCOME_ALREADY_RECORDED'; END IF;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_recommendation_outcome(text,timestamptz,numeric,numeric,numeric,text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_recommendation_outcome(text,timestamptz,numeric,numeric,numeric,text,uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.record_decision_outcome(text,text,text,timestamptz,text,numeric,numeric,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_decision_outcome(text,text,text,timestamptz,text,numeric,numeric,numeric,text) TO authenticated;
