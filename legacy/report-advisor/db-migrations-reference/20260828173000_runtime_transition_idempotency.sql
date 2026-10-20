-- Canonical runtime transition/idempotency hardening.
-- Extends the existing PR #84 entities; no duplicate workflow tables.

CREATE OR REPLACE FUNCTION public.start_decision_work_item(p_work_item_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_decision uuid;
  v_status text;
BEGIN
  IF v_company IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT decision_id,status INTO v_decision,v_status
    FROM public.decision_work_items
    WHERE id=p_work_item_id AND company_id=v_company FOR UPDATE;
  IF v_decision IS NULL THEN RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND'; END IF;
  IF v_status <> 'OPEN' THEN RAISE EXCEPTION 'WORK_ITEM_NOT_STARTABLE'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_intelligence_decisions d
    WHERE d.id=v_decision AND d.company_id=v_company AND d.status='APPROVED'
  ) THEN RAISE EXCEPTION 'APPROVAL_REQUIRED'; END IF;
  UPDATE public.decision_work_items
    SET status='IN_PROGRESS', started_at=COALESCE(started_at,now()), updated_at=now()
    WHERE id=p_work_item_id AND company_id=v_company AND status='OPEN';
  IF NOT FOUND THEN RAISE EXCEPTION 'WORK_ITEM_STATE_CHANGED'; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_decision_action_receipt(
  p_work_item_id uuid,
  p_idempotency_key text,
  p_decision_fingerprint text,
  p_evidence_snapshot_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_id uuid;
  v_existing uuid;
BEGIN
  IF v_company IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF NULLIF(trim(p_idempotency_key),'') IS NULL THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.decision_work_items w
    JOIN public.business_intelligence_decisions d ON d.id=w.decision_id AND d.company_id=w.company_id
    WHERE w.id=p_work_item_id AND w.company_id=v_company AND w.status='IN_PROGRESS' AND d.status='APPROVED'
  ) THEN RAISE EXCEPTION 'WORK_ITEM_NOT_EXECUTABLE'; END IF;
  SELECT id INTO v_existing FROM public.decision_action_receipts
    WHERE company_id=v_company AND idempotency_key=p_idempotency_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  INSERT INTO public.decision_action_receipts(
    company_id,work_item_id,idempotency_key,status,attempt,evidence_snapshot_id,decision_fingerprint
  ) VALUES(v_company,p_work_item_id,p_idempotency_key,'ACCEPTED',1,p_evidence_snapshot_id,p_decision_fingerprint)
  ON CONFLICT(company_id,idempotency_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.decision_action_receipts
      WHERE company_id=v_company AND idempotency_key=p_idempotency_key;
  END IF;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_decision_work_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_decision_action_receipt(uuid,text,text,uuid) TO authenticated;
