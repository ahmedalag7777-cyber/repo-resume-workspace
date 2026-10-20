-- Runtime lifecycle hardening for the canonical decision/action/outcome slice.
-- Extends existing entities only; no duplicate workflow model is introduced.

-- Approval mutations retain actor attribution and cannot be requested more than once
-- for an already approved/rejected decision because the canonical request function
-- only accepts PROPOSED decisions.
CREATE OR REPLACE FUNCTION public.request_decision_approval(p_decision_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_actor uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_company IS NULL OR v_actor IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_intelligence_decisions d
    WHERE d.id=p_decision_id AND d.company_id=v_company AND d.status='PROPOSED'
  ) THEN RAISE EXCEPTION 'DECISION_NOT_APPROVABLE'; END IF;
  INSERT INTO public.decision_approvals(company_id,decision_id,status,requested_by,reason)
  VALUES(v_company,p_decision_id,'PENDING',v_actor,p_reason)
  ON CONFLICT(company_id,decision_id) DO UPDATE
    SET status='PENDING', requested_by=v_actor, reason=EXCLUDED.reason,
        requested_at=now(), decided_at=NULL, decided_by=NULL;
  SELECT id INTO v_id FROM public.decision_approvals
    WHERE company_id=v_company AND decision_id=p_decision_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_approval(p_approval_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_actor uuid := auth.uid();
  v_decision uuid;
  v_status text;
BEGIN
  IF v_company IS NULL OR v_actor IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT decision_id,status INTO v_decision,v_status
    FROM public.decision_approvals
    WHERE id=p_approval_id AND company_id=v_company FOR UPDATE;
  IF v_decision IS NULL OR v_status <> 'PENDING' THEN RAISE EXCEPTION 'APPROVAL_NOT_PENDING'; END IF;
  UPDATE public.decision_approvals
    SET status=CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
        decided_at=now(), decided_by=v_actor, reason=p_reason
    WHERE id=p_approval_id AND company_id=v_company;
  UPDATE public.business_intelligence_decisions
    SET status=CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
        approved_by=CASE WHEN p_approve THEN v_actor ELSE NULL END,
        approved_at=CASE WHEN p_approve THEN now() ELSE NULL END,
        rejection_reason=CASE WHEN p_approve THEN NULL ELSE p_reason END
    WHERE id=v_decision AND company_id=v_company AND status='PROPOSED';
  IF NOT FOUND THEN RAISE EXCEPTION 'DECISION_STATE_CHANGED'; END IF;
  RETURN true;
END;
$$;

-- Work items are actionable only after an approved decision. The policy preserves
-- tenant isolation while closing the approval-bypass write path.
DROP POLICY IF EXISTS decision_work_items_tenant ON public.decision_work_items;
CREATE POLICY decision_work_items_tenant ON public.decision_work_items
FOR ALL TO authenticated
USING (company_id=public.current_company_id())
WITH CHECK (
  company_id=public.current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.business_intelligence_decisions d
    WHERE d.id=decision_id AND d.company_id=company_id AND d.status='APPROVED'
  )
);

-- Action receipts must reference an approved decision through their work item.
DROP POLICY IF EXISTS decision_action_receipts_tenant ON public.decision_action_receipts;
CREATE POLICY decision_action_receipts_tenant ON public.decision_action_receipts
FOR ALL TO authenticated
USING (decision_action_receipts.company_id=public.current_company_id())
WITH CHECK (
  decision_action_receipts.company_id=public.current_company_id()
  AND EXISTS (
    SELECT 1
    FROM public.decision_work_items w
    JOIN public.business_intelligence_decisions d ON d.id=w.decision_id AND d.company_id=w.company_id
    WHERE w.id=decision_action_receipts.work_item_id
      AND w.company_id=decision_action_receipts.company_id
      AND d.status='APPROVED'
  )
);

-- Completion is terminal and requires an approved decision; execution is then
-- recorded as EXECUTED in the same transaction as the outcome persistence.
CREATE OR REPLACE FUNCTION public.complete_decision_work_item(p_work_item_id uuid, p_actual_impact numeric, p_evidence jsonb DEFAULT '{}'::jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_expected numeric;
  v_decision uuid;
  v_recommendation_key text;
  v_status text;
BEGIN
  IF v_company IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT expected_impact,decision_id,status INTO v_expected,v_decision,v_status
    FROM public.decision_work_items WHERE id=p_work_item_id AND company_id=v_company FOR UPDATE;
  IF v_decision IS NULL THEN RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND'; END IF;
  IF v_status <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'WORK_ITEM_NOT_EXECUTABLE'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_intelligence_decisions d
    WHERE d.id=v_decision AND d.company_id=v_company AND d.status='APPROVED'
  ) THEN RAISE EXCEPTION 'APPROVAL_REQUIRED'; END IF;
  UPDATE public.decision_work_items
    SET status='COMPLETED', actual_impact=p_actual_impact, completed_at=now(), updated_at=now()
    WHERE id=p_work_item_id AND company_id=v_company;
  SELECT COALESCE(r.id::text, d.decision_key) INTO v_recommendation_key
    FROM public.business_intelligence_decisions d
    LEFT JOIN public.recommendations r ON r.id=d.recommendation_id AND r.company_id=v_company
    WHERE d.id=v_decision AND d.company_id=v_company;
  INSERT INTO public.recommendation_outcomes(company_id,recommendation_key,decision_id,expected_impact,actual_impact,status,evidence)
  VALUES(v_company,v_recommendation_key,v_decision,v_expected,p_actual_impact,
    CASE WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient'
         WHEN p_actual_impact > v_expected THEN 'positive'
         WHEN p_actual_impact = v_expected THEN 'neutral' ELSE 'negative' END,
    jsonb_build_object('work_item_id',p_work_item_id,
      'outcome_delta',CASE WHEN v_expected IS NULL OR p_actual_impact IS NULL THEN NULL ELSE p_actual_impact-v_expected END)
      || COALESCE(p_evidence,'{}'::jsonb))
  ON CONFLICT(company_id,recommendation_key) DO UPDATE
    SET actual_impact=EXCLUDED.actual_impact,status=EXCLUDED.status,observed_at=now(),evidence=EXCLUDED.evidence;
  UPDATE public.business_intelligence_decisions
    SET status='EXECUTED', executed_at=now()
    WHERE id=v_decision AND company_id=v_company AND status='APPROVED';
  IF NOT FOUND THEN RAISE EXCEPTION 'DECISION_STATE_CHANGED'; END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_decision_approval(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_approval(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) TO authenticated;
