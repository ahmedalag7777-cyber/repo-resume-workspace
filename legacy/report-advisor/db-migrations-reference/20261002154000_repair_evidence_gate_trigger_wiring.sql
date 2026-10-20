-- Repair the live Evidence Passport trigger wiring and align source-decision confidence semantics.
-- Source decisions intentionally use confidence=NULL with confidenceSemantics=NOT_ASSESSED.

CREATE OR REPLACE FUNCTION public.create_runtime_decision(
  p_decision_key text,
  p_decision_type text,
  p_confidence numeric,
  p_expected_impact numeric,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,'pg_catalog'
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN
    RAISE EXCEPTION 'DECISION_CONFIDENCE_OUT_OF_RANGE';
  END IF;
  IF p_decision_key IS NULL OR btrim(p_decision_key)='' THEN
    RAISE EXCEPTION 'DECISION_KEY_REQUIRED';
  END IF;
  IF p_decision_type IS NULL OR btrim(p_decision_type)='' THEN
    RAISE EXCEPTION 'DECISION_TYPE_REQUIRED';
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' OR p_evidence='{}'::jsonb THEN
    RAISE EXCEPTION 'DECISION_EVIDENCE_REQUIRED';
  END IF;

  INSERT INTO public.business_intelligence_decisions(
    company_id,decision_key,decision_type,status,confidence,expected_impact,evidence
  )
  VALUES(
    v_company,p_decision_key,p_decision_type,'PROPOSED',p_confidence,p_expected_impact,p_evidence
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_runtime_decision(text,text,numeric,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_runtime_decision(text,text,numeric,numeric,jsonb) TO authenticated;

DROP TRIGGER IF EXISTS trg_source_recommendation_evidence ON public.recommendations;
CREATE TRIGGER trg_source_recommendation_evidence
BEFORE INSERT OR UPDATE ON public.recommendations
FOR EACH ROW EXECUTE FUNCTION public.enforce_source_recommendation_evidence();

DROP TRIGGER IF EXISTS trg_source_decision_evidence ON public.business_intelligence_decisions;
CREATE TRIGGER trg_source_decision_evidence
BEFORE INSERT OR UPDATE ON public.business_intelligence_decisions
FOR EACH ROW EXECUTE FUNCTION public.enforce_source_decision_evidence();

DROP TRIGGER IF EXISTS trg_source_work_item_evidence ON public.decision_work_items;
CREATE TRIGGER trg_source_work_item_evidence
BEFORE INSERT OR UPDATE ON public.decision_work_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_source_work_item_evidence();
