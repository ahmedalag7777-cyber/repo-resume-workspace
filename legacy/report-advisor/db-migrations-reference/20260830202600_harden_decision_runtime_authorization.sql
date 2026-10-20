-- Cycle 026: close decision runtime authorization and lifecycle bypasses.

CREATE OR REPLACE FUNCTION public.decide_approval(p_approval_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.current_company_id(); v_user uuid := auth.uid(); v_decision uuid; v_status text; v_requested_by uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT decision_id,status,requested_by INTO v_decision,v_status,v_requested_by FROM public.decision_approvals WHERE id=p_approval_id AND company_id=v_company FOR UPDATE;
  IF v_decision IS NULL OR v_status <> 'PENDING' THEN RAISE EXCEPTION 'APPROVAL_NOT_PENDING'; END IF;
  IF p_approve AND v_requested_by=v_user THEN RAISE EXCEPTION 'SELF_APPROVAL_FORBIDDEN'; END IF;
  UPDATE public.decision_approvals SET status=CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,decided_at=now(),decided_by=v_user,reason=p_reason WHERE id=p_approval_id AND company_id=v_company AND status='PENDING';
  IF NOT FOUND THEN RAISE EXCEPTION 'APPROVAL_STATE_CHANGED'; END IF;
  UPDATE public.business_intelligence_decisions SET status=CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,approved_by=CASE WHEN p_approve THEN v_user ELSE NULL END,approved_at=CASE WHEN p_approve THEN now() ELSE NULL END,rejection_reason=CASE WHEN p_approve THEN NULL ELSE p_reason END WHERE id=v_decision AND company_id=v_company AND status='PROPOSED';
  IF NOT FOUND THEN RAISE EXCEPTION 'DECISION_STATE_CHANGED'; END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_decision_work_item(p_work_item_id uuid,p_actual_impact numeric,p_evidence jsonb DEFAULT '{}'::jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid := public.current_company_id(); v_user uuid := auth.uid(); v_expected numeric; v_decision uuid; v_recommendation_key text; v_status text; v_assignee uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT w.expected_impact,w.decision_id,w.status,w.assignee_id INTO v_expected,v_decision,v_status,v_assignee FROM public.decision_work_items w JOIN public.business_intelligence_decisions d ON d.id=w.decision_id AND d.company_id=v_company AND d.status='APPROVED' WHERE w.id=p_work_item_id AND w.company_id=v_company FOR UPDATE OF w;
  IF v_decision IS NULL THEN RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND_OR_DECISION_NOT_APPROVED'; END IF;
  IF v_status <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'WORK_ITEM_NOT_IN_PROGRESS'; END IF;
  IF v_assignee IS NOT NULL AND v_assignee <> v_user THEN RAISE EXCEPTION 'WORK_ITEM_ASSIGNEE_FORBIDDEN'; END IF;
  UPDATE public.decision_work_items SET status='COMPLETED',actual_impact=p_actual_impact,completed_at=now(),updated_at=now() WHERE id=p_work_item_id AND company_id=v_company AND status='IN_PROGRESS';
  IF NOT FOUND THEN RAISE EXCEPTION 'WORK_ITEM_STATE_CHANGED'; END IF;
  SELECT COALESCE(r.id::text,d.decision_key) INTO v_recommendation_key FROM public.business_intelligence_decisions d LEFT JOIN public.recommendations r ON r.id=d.recommendation_id AND r.company_id=v_company WHERE d.id=v_decision AND d.company_id=v_company;
  INSERT INTO public.recommendation_outcomes(company_id,recommendation_key,decision_id,expected_impact,actual_impact,status,evidence) VALUES (v_company,v_recommendation_key,v_decision,v_expected,p_actual_impact,CASE WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient' WHEN p_actual_impact>v_expected THEN 'positive' WHEN p_actual_impact=v_expected THEN 'neutral' ELSE 'negative' END,jsonb_build_object('work_item_id',p_work_item_id,'outcome_delta',CASE WHEN v_expected IS NULL OR p_actual_impact IS NULL THEN NULL ELSE p_actual_impact-v_expected END)||COALESCE(p_evidence,'{}'::jsonb)) ON CONFLICT(company_id,recommendation_key) DO UPDATE SET actual_impact=EXCLUDED.actual_impact,status=EXCLUDED.status,observed_at=now(),evidence=EXCLUDED.evidence;
  UPDATE public.business_intelligence_decisions SET status='EXECUTED',executed_at=now() WHERE id=v_decision AND company_id=v_company AND status='APPROVED';
  IF NOT FOUND THEN RAISE EXCEPTION 'DECISION_STATE_CHANGED'; END IF;
  RETURN true;
END; $$;

ALTER FUNCTION public.decide_approval(uuid,boolean,text) SET search_path=public;
ALTER FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) SET search_path=public;
REVOKE ALL ON FUNCTION public.decide_approval(uuid,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_approval(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) TO authenticated;
