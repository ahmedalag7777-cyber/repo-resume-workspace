-- Close the final decision-outcome lifecycle bypass: an outcome is only
-- valid when it points to a tenant-scoped COMPLETED work item attached to an
-- EXECUTED decision. Persist the authenticated actor as generated provenance.

ALTER TABLE public.decision_outcomes
  ADD COLUMN IF NOT EXISTS observed_by uuid;

CREATE INDEX IF NOT EXISTS idx_decision_outcomes_tenant_observed_by
  ON public.decision_outcomes(company_id, observed_by, observed_at DESC);

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
  v_user uuid := auth.uid();
  v_id uuid;
  v_decision uuid;
  v_work_item uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF p_decision_fingerprint IS NULL OR btrim(p_decision_fingerprint) = ''
     OR p_evidence_snapshot_id IS NULL OR btrim(p_evidence_snapshot_id) = ''
     OR p_observed_at IS NULL THEN
    RAISE EXCEPTION 'OUTCOME_IDENTITY_INCOMPLETE';
  END IF;

  SELECT d.id INTO v_decision
  FROM public.business_intelligence_decisions d
  WHERE d.company_id = v_company
    AND d.decision_key = p_decision_fingerprint
    AND d.status = 'EXECUTED';

  IF v_decision IS NULL THEN
    RAISE EXCEPTION 'OUTCOME_DECISION_NOT_EXECUTED_OR_FORBIDDEN';
  END IF;

  IF p_action_id IS NULL OR btrim(p_action_id) = ''
     OR p_action_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'OUTCOME_WORK_ITEM_REQUIRED';
  END IF;

  SELECT w.id INTO v_work_item
  FROM public.decision_work_items w
  WHERE w.id = p_action_id::uuid
    AND w.company_id = v_company
    AND w.decision_id = v_decision
    AND w.status = 'COMPLETED';

  IF v_work_item IS NULL THEN
    RAISE EXCEPTION 'OUTCOME_WORK_ITEM_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.kpi_evidence_snapshots s WHERE s.id::text = p_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.business_state_snapshots s WHERE s.id::text = p_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.import_snapshots s WHERE s.id::text = p_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.operational_health_snapshots s WHERE s.id::text = p_evidence_snapshot_id AND s.company_id = v_company)
    OR EXISTS (SELECT 1 FROM public.decision_action_receipts r WHERE r.id::text = p_evidence_snapshot_id AND r.company_id = v_company AND r.status IN ('SUCCEEDED','RUNNING'))
  ) THEN
    RAISE EXCEPTION 'OUTCOME_EVIDENCE_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  IF p_label NOT IN ('correct','incorrect','partial','unknown') THEN
    RAISE EXCEPTION 'INVALID_OUTCOME_LABEL';
  END IF;

  INSERT INTO public.decision_outcomes(
    company_id, decision_fingerprint, evidence_snapshot_id, action_id,
    observed_at, observed_by, label, actual_value, expected_value,
    impact_value, notes
  )
  VALUES(
    v_company, p_decision_fingerprint, p_evidence_snapshot_id, p_action_id,
    p_observed_at, v_user, p_label, p_actual_value, p_expected_value,
    p_impact_value, p_notes
  )
  ON CONFLICT(company_id,decision_fingerprint,observed_at) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'OUTCOME_ALREADY_RECORDED';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_decision_outcome(text,text,text,timestamptz,text,numeric,numeric,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_decision_outcome(text,text,text,timestamptz,text,numeric,numeric,numeric,text) TO authenticated;
COMMENT ON FUNCTION public.record_decision_outcome(text,text,text,timestamptz,text,numeric,numeric,numeric,text)
IS 'Canonical outcome boundary: outcome truth requires an EXECUTED tenant-scoped decision, a COMPLETED tenant-scoped work item attached to that decision, valid tenant-scoped evidence, and generated actor provenance.';
