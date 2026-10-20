-- Harden the decision -> action lifecycle without changing the canonical entity model.
-- A work item is actionable only after the decision has been explicitly approved.
-- Completion is also fail-closed so an unapproved/stale work item cannot create an outcome.

CREATE OR REPLACE FUNCTION public.request_decision_approval(p_decision_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_id uuid;
  v_user uuid := auth.uid();
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_intelligence_decisions d
    WHERE d.id = p_decision_id
      AND d.company_id = v_company
      AND d.status = 'PROPOSED'
  ) THEN
    RAISE EXCEPTION 'DECISION_NOT_APPROVABLE';
  END IF;

  INSERT INTO public.decision_approvals(company_id, decision_id, status, requested_by, reason)
  VALUES (v_company, p_decision_id, 'PENDING', v_user, p_reason)
  ON CONFLICT(company_id, decision_id) DO UPDATE
    SET status = 'PENDING',
        requested_by = EXCLUDED.requested_by,
        reason = EXCLUDED.reason,
        requested_at = now(),
        decided_at = NULL,
        decided_by = NULL
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_approval(p_approval_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_decision uuid;
  v_status text;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  SELECT decision_id, status
    INTO v_decision, v_status
  FROM public.decision_approvals
  WHERE id = p_approval_id
    AND company_id = v_company
  FOR UPDATE;

  IF v_decision IS NULL OR v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'APPROVAL_NOT_PENDING';
  END IF;

  UPDATE public.decision_approvals
    SET status = CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
        decided_at = now(),
        decided_by = v_user,
        reason = p_reason
  WHERE id = p_approval_id
    AND company_id = v_company;

  UPDATE public.business_intelligence_decisions
    SET status = CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
        approved_by = CASE WHEN p_approve THEN v_user ELSE NULL END,
        approved_at = CASE WHEN p_approve THEN now() ELSE NULL END,
        rejection_reason = CASE WHEN p_approve THEN NULL ELSE p_reason END
  WHERE id = v_decision
    AND company_id = v_company;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_decision_work_item(p_decision_id uuid, p_recommendation_id uuid, p_department text, p_assignee_id uuid, p_assignee_label text, p_title text, p_description text, p_priority text, p_due_at timestamptz, p_expected_impact numeric, p_evidence_refs jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_id uuid;
BEGIN
  IF v_company IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_intelligence_decisions d
    WHERE d.id = p_decision_id
      AND d.company_id = v_company
      AND d.status = 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'DECISION_NOT_APPROVED';
  END IF;

  IF p_recommendation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.recommendations r
    WHERE r.id = p_recommendation_id AND r.company_id = v_company
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  INSERT INTO public.decision_work_items(
    company_id, decision_id, recommendation_id, department, assignee_id,
    assignee_label, title, description, priority, due_at, expected_impact, evidence_refs
  ) VALUES (
    v_company, p_decision_id, p_recommendation_id, p_department, p_assignee_id,
    p_assignee_label, p_title, p_description, p_priority, p_due_at,
    p_expected_impact, COALESCE(p_evidence_refs, '[]'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_decision_work_item(p_work_item_id uuid, p_actual_impact numeric, p_evidence jsonb DEFAULT '{}'::jsonb)
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
  IF v_company IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

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

  IF v_decision IS NULL THEN
    RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND_OR_DECISION_NOT_APPROVED';
  END IF;

  IF v_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'WORK_ITEM_ALREADY_COMPLETED';
  END IF;

  UPDATE public.decision_work_items
    SET status = 'COMPLETED', actual_impact = p_actual_impact,
        completed_at = now(), updated_at = now()
  WHERE id = p_work_item_id AND company_id = v_company;

  SELECT COALESCE(r.id::text, d.decision_key)
    INTO v_recommendation_key
  FROM public.business_intelligence_decisions d
  LEFT JOIN public.recommendations r
    ON r.id = d.recommendation_id AND r.company_id = v_company
  WHERE d.id = v_decision AND d.company_id = v_company;

  INSERT INTO public.recommendation_outcomes(
    company_id, recommendation_key, decision_id, expected_impact, actual_impact,
    status, evidence
  )
  VALUES (
    v_company, v_recommendation_key, v_decision, v_expected, p_actual_impact,
    CASE
      WHEN p_actual_impact IS NULL OR v_expected IS NULL THEN 'insufficient'
      WHEN p_actual_impact > v_expected THEN 'positive'
      WHEN p_actual_impact = v_expected THEN 'neutral'
      ELSE 'negative'
    END,
    jsonb_build_object(
      'work_item_id', p_work_item_id,
      'outcome_delta', CASE WHEN v_expected IS NULL OR p_actual_impact IS NULL THEN NULL ELSE p_actual_impact - v_expected END
    ) || COALESCE(p_evidence, '{}'::jsonb)
  )
  ON CONFLICT(company_id, recommendation_key) DO UPDATE
    SET actual_impact = EXCLUDED.actual_impact,
        status = EXCLUDED.status,
        observed_at = now(),
        evidence = EXCLUDED.evidence;

  UPDATE public.business_intelligence_decisions
    SET status = 'EXECUTED', executed_at = now()
  WHERE id = v_decision AND company_id = v_company AND status = 'APPROVED';

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_decision_approval(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_approval(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_decision_work_item(uuid,uuid,text,uuid,text,text,text,text,timestamptz,numeric,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) TO authenticated;

COMMENT ON FUNCTION public.create_decision_work_item(uuid,uuid,text,uuid,text,text,text,text,timestamptz,numeric,jsonb)
IS 'Canonical decision action boundary: work items may only be created from tenant-scoped APPROVED decisions.';
