-- Live staging migration recorded at 20260830161214.
-- The later 20260831000500 migration reasserts this contract after all
-- subsequent 20260830 lifecycle function replacements during fresh replay.
CREATE OR REPLACE FUNCTION public.complete_decision_work_item(
  p_work_item_id uuid,
  p_actual_impact numeric,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_expected numeric;
  v_decision uuid;
  v_recommendation_key text;
  v_status text;
  v_evidence_snapshot_id text := NULLIF(btrim(COALESCE(p_evidence->>'evidence_snapshot_id', '')), '');
BEGIN
  IF v_company IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT w.expected_impact, w.decision_id, w.status INTO v_expected, v_decision, v_status
  FROM public.decision_work_items w
  JOIN public.business_intelligence_decisions d ON d.id = w.decision_id AND d.company_id = v_company AND d.status = 'APPROVED'
  WHERE w.id = p_work_item_id AND w.company_id = v_company FOR UPDATE OF w;
  IF v_decision IS NULL THEN RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND_OR_DECISION_NOT_APPROVED'; END IF;
  IF v_status <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'WORK_ITEM_NOT_EXECUTABLE'; END IF;
  IF v_evidence_snapshot_id IS NULL THEN RAISE EXCEPTION 'OUTCOME_EVIDENCE_REQUIRED'; END IF;
  UPDATE public.decision_work_items SET status = 'COMPLETED', actual_impact = p_actual_impact, completed_at = now(), updated_at = now()
  WHERE id = p_work_item_id AND company_id = v_company AND status = 'IN_PROGRESS';
  IF NOT FOUND THEN RAISE EXCEPTION 'WORK_ITEM_STATE_CHANGED'; END IF;
  SELECT COALESCE(r.id::text, d.decision_key) INTO v_recommendation_key
  FROM public.business_intelligence_decisions d
  LEFT JOIN public.recommendations r ON r.id = d.recommendation_id AND r.company_id = v_company
  WHERE d.id = v_decision AND d.company_id = v_company;
  v_status := CASE WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient' WHEN p_actual_impact > v_expected THEN 'positive' WHEN p_actual_impact = v_expected THEN 'neutral' ELSE 'negative' END;
  INSERT INTO public.recommendation_outcomes(company_id, recommendation_key, decision_id, expected_impact, actual_impact, status, evidence)
  VALUES (v_company, v_recommendation_key, v_decision, v_expected, p_actual_impact, v_status,
    COALESCE(p_evidence, '{}'::jsonb) || jsonb_build_object('work_item_id', p_work_item_id, 'evidence_snapshot_id', v_evidence_snapshot_id,
      'outcome_delta', CASE WHEN v_expected IS NULL OR p_actual_impact IS NULL THEN NULL ELSE p_actual_impact - v_expected END))
  ON CONFLICT(company_id, recommendation_key) DO UPDATE SET actual_impact = EXCLUDED.actual_impact, status = EXCLUDED.status, observed_at = now(), evidence = EXCLUDED.evidence;
  UPDATE public.business_intelligence_decisions SET status = 'EXECUTED', executed_at = now()
  WHERE id = v_decision AND company_id = v_company AND status = 'APPROVED';
  IF NOT FOUND THEN RAISE EXCEPTION 'DECISION_STATE_CHANGED'; END IF;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) TO authenticated;
COMMENT ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb)
IS 'Canonical terminal boundary: only IN_PROGRESS work items attached to tenant-scoped APPROVED decisions can complete, and completion requires explicit outcome evidence provenance.';
