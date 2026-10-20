-- CYCLE-015: close client-side lifecycle DML bypasses.
-- Applied to Report-Advisor-P0-2-Staging as migration canonical_decision_dml_boundaries.
-- No production data mutation.

CREATE OR REPLACE FUNCTION public.create_runtime_recommendation(
  p_category text,
  p_priority text,
  p_title text,
  p_description text DEFAULT NULL,
  p_evidence jsonb DEFAULT '{}'::jsonb,
  p_expected_impact numeric DEFAULT NULL,
  p_evidence_snapshot_id uuid DEFAULT NULL,
  p_metric_versions jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid := public.current_company_id(); v_user uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'RECOMMENDATION_TITLE_REQUIRED'; END IF;
  INSERT INTO public.recommendations(company_id,category,priority,title,description,evidence,expected_impact,confidence,status,evidence_snapshot_id,metric_versions)
  VALUES(v_company,p_category,COALESCE(NULLIF(p_priority,''),'medium'),p_title,p_description,COALESCE(p_evidence,'{}'::jsonb),p_expected_impact,'CALCULATED','new',p_evidence_snapshot_id,COALESCE(p_metric_versions,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_runtime_decision(
  p_decision_key text,
  p_decision_type text,
  p_confidence numeric,
  p_expected_impact numeric,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid := public.current_company_id(); v_user uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_confidence IS NULL OR p_confidence < 0 OR p_confidence > 1 THEN RAISE EXCEPTION 'DECISION_CONFIDENCE_OUT_OF_RANGE'; END IF;
  IF p_decision_key IS NULL OR btrim(p_decision_key) = '' THEN RAISE EXCEPTION 'DECISION_KEY_REQUIRED'; END IF;
  INSERT INTO public.business_intelligence_decisions(company_id,decision_key,decision_type,status,confidence,expected_impact,evidence)
  VALUES(v_company,p_decision_key,p_decision_type,'PROPOSED',p_confidence,p_expected_impact,COALESCE(p_evidence,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_decision_work_item(p_work_item_id uuid,p_title text,p_description text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid := public.current_company_id(); v_user uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.decision_work_items w WHERE w.id=p_work_item_id AND w.company_id=v_company) THEN RAISE EXCEPTION 'WORK_ITEM_NOT_FOUND_OR_FORBIDDEN'; END IF;
  INSERT INTO public.alerts(company_id,severity,category,title,description,entity_type,entity_id)
  VALUES(v_company,'info','decision_action',p_title,p_description,'decision_work_item',p_work_item_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

REVOKE INSERT ON TABLE public.recommendations FROM authenticated;
REVOKE INSERT ON TABLE public.business_intelligence_decisions FROM authenticated;
REVOKE INSERT ON TABLE public.alerts FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_runtime_recommendation(text,text,text,text,jsonb,numeric,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_runtime_decision(text,text,numeric,numeric,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_decision_work_item(uuid,text,text) TO authenticated;
