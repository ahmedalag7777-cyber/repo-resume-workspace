-- Completion must follow the canonical work-item lifecycle.
-- APPROVED decision authority alone is insufficient: only an IN_PROGRESS work item
-- may produce a COMPLETED action and downstream outcome.
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
BEGIN
  IF v_company IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;

  SELECT w.expected_impact, w.decision_id, w.status
    INTO v_expected, v_decision, v_status
  FROM public.decision_work_items w
  JOIN public.business_intelligence_decisions d
    ON d.id = w.decision_id
   AND d.company_id = v_company
   AND d.status = 'APPROVED'
  WHERE w.id = p_work_item_id
    AND w.company_id = v_company
  FOR UPDATE OF w;

  IF v_decision IS NULL THEN RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND_OR_DECISION_NOT_APPROVED'; END IF;
  IF v_status <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'WORK_ITEM_NOT_EXECUTABLE'; END IF;

  UPDATE public.decision_work_items
    SET status='COMPLETED', actual_impact=p_actual_impact, completed_at=now(), updated_at=now()
  WHERE id=p_work_item_id AND company_id=v_company;

  SELECT COALESCE(r.id::text, d.decision_key) INTO v_recommendation_key
  FROM public.business_intelligence_decisions d
  LEFT JOIN public.recommendations r ON r.id=d.recommendation_id AND r.company_id=v_company
  WHERE d.id=v_decision AND d.company_id=v_company;

  INSERT INTO public.recommendation_outcomes(
    company_id,recommendation_key,decision_id,expected_impact,actual_impact,status,evidence
  ) VALUES (
    v_company,v_recommendation_key,v_decision,v_expected,p_actual_impact,
    CASE WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient'
         WHEN p_actual_impact>v_expected THEN 'positive'
         WHEN p_actual_impact=v_expected THEN 'neutral'
         ELSE 'negative' END,
    jsonb_build_object(
      'work_item_id',p_work_item_id,
      'outcome_delta',CASE WHEN v_expected IS NULL OR p_actual_impact IS NULL THEN NULL ELSE p_actual_impact-v_expected END
    ) || COALESCE(p_evidence,'{}'::jsonb)
  )
  ON CONFLICT(company_id,recommendation_key) DO UPDATE
    SET actual_impact=EXCLUDED.actual_impact,status=EXCLUDED.status,observed_at=now(),evidence=EXCLUDED.evidence;

  UPDATE public.business_intelligence_decisions
    SET status='EXECUTED', executed_at=now()
  WHERE id=v_decision AND company_id=v_company AND status='APPROVED';
  IF NOT FOUND THEN RAISE EXCEPTION 'DECISION_STATE_CHANGED'; END IF;
  RETURN true;
END;
$$;
