-- Establish the missing authenticated transition from OPEN to IN_PROGRESS.
-- Completion already requires IN_PROGRESS; this RPC makes that state reachable
-- without granting authenticated callers direct UPDATE on the work-item table.
CREATE OR REPLACE FUNCTION public.start_decision_work_item(p_work_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_status text;
  v_assignee uuid;
  v_decision uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  SELECT w.status, w.assignee_id, w.decision_id
    INTO v_status, v_assignee, v_decision
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
  IF v_status <> 'OPEN' THEN
    RAISE EXCEPTION 'WORK_ITEM_NOT_STARTABLE';
  END IF;
  IF v_assignee IS NOT NULL AND v_assignee <> v_user THEN
    RAISE EXCEPTION 'WORK_ITEM_ASSIGNEE_FORBIDDEN';
  END IF;

  UPDATE public.decision_work_items
     SET status = 'IN_PROGRESS',
         started_at = COALESCE(started_at, now()),
         updated_at = now()
   WHERE id = p_work_item_id
     AND company_id = v_company
     AND status = 'OPEN';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORK_ITEM_STATE_CHANGED';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_decision_work_item(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.start_decision_work_item(uuid) FROM anon;
