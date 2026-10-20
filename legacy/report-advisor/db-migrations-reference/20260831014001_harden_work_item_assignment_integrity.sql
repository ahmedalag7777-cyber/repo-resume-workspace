-- Work-item creation must not accept an arbitrary same-tenant user or an
-- unrelated recommendation. Both relationships are part of the governed
-- decision lifecycle and must be checked inside the SECURITY DEFINER boundary.
CREATE OR REPLACE FUNCTION public.create_decision_work_item(
  p_decision_id uuid,
  p_recommendation_id uuid,
  p_department text,
  p_assignee_id uuid,
  p_assignee_label text,
  p_title text,
  p_description text,
  p_priority text,
  p_due_at timestamptz,
  p_expected_impact numeric,
  p_evidence_refs jsonb
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
  IF NOT EXISTS (
    SELECT 1 FROM public.business_intelligence_decisions d
    WHERE d.id = p_decision_id AND d.company_id = v_company AND d.status = 'APPROVED'
  ) THEN RAISE EXCEPTION 'DECISION_NOT_APPROVED'; END IF;
  IF p_recommendation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.recommendations r
    WHERE r.id = p_recommendation_id
      AND r.company_id = v_company
      AND r.decision_id = p_decision_id
  ) THEN RAISE EXCEPTION 'RECOMMENDATION_NOT_FOUND_OR_NOT_LINKED'; END IF;
  IF p_assignee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = v_company AND m.user_id = p_assignee_id
  ) THEN RAISE EXCEPTION 'ASSIGNEE_NOT_TENANT_MEMBER'; END IF;
  IF p_department IS NULL OR btrim(p_department) = '' THEN RAISE EXCEPTION 'WORK_ITEM_DEPARTMENT_REQUIRED'; END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'WORK_ITEM_TITLE_REQUIRED'; END IF;
  IF p_priority NOT IN ('LOW','MEDIUM','HIGH','CRITICAL') THEN RAISE EXCEPTION 'INVALID_WORK_ITEM_PRIORITY'; END IF;
  INSERT INTO public.decision_work_items(company_id,decision_id,recommendation_id,department,assignee_id,assignee_label,title,description,priority,due_at,expected_impact,evidence_refs)
  VALUES(v_company,p_decision_id,p_recommendation_id,p_department,p_assignee_id,p_assignee_label,p_title,p_description,p_priority,p_due_at,p_expected_impact,COALESCE(p_evidence_refs,'[]'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_decision_work_item(uuid,uuid,text,uuid,text,text,text,text,timestamptz,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_decision_work_item(uuid,uuid,text,uuid,text,text,text,text,timestamptz,numeric,jsonb) TO authenticated;
