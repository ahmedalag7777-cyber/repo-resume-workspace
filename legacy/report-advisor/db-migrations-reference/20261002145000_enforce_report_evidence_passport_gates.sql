-- Fail-closed DB boundary: source-bound recommendation/decision/work requires a VERIFIED Evidence Passport.

CREATE OR REPLACE FUNCTION public.enforce_source_recommendation_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_catalog' AS $function$
BEGIN
  IF lower(coalesce(NEW.category,''))='source-intelligence' THEN
    IF NEW.evidence_snapshot_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.report_evidence_passports p
      WHERE p.company_id=NEW.company_id
        AND p.evidence_snapshot_id=NEW.evidence_snapshot_id
        AND p.verification_status='VERIFIED'
        AND p.decision_readiness='READY'
    ) THEN
      RAISE EXCEPTION 'SOURCE_EVIDENCE_PASSPORT_REQUIRED';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_source_recommendation_evidence ON public.recommendations;
CREATE TRIGGER trg_source_recommendation_evidence BEFORE INSERT OR UPDATE ON public.recommendations FOR EACH ROW EXECUTE FUNCTION public.enforce_source_recommendation_evidence();

CREATE OR REPLACE FUNCTION public.enforce_source_decision_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_catalog' AS $function$
DECLARE v_snapshot uuid; v_hash text; v_job uuid; v_passport public.report_evidence_passports%ROWTYPE;
BEGIN
  IF upper(coalesce(NEW.decision_type,''))='SOURCE_INTELLIGENCE_SIGNAL' THEN
    BEGIN v_snapshot:=nullif(NEW.evidence->>'evidenceSnapshotId','')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_snapshot:=NULL; END;
    BEGIN v_job:=nullif(NEW.evidence->>'reportExecutionJobId','')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_job:=NULL; END;
    v_hash:=nullif(trim(NEW.evidence->>'sourceHash'),'');
    IF v_snapshot IS NULL OR v_job IS NULL OR v_hash IS NULL THEN RAISE EXCEPTION 'SOURCE_DECISION_EVIDENCE_PASSPORT_REQUIRED'; END IF;
    SELECT * INTO v_passport FROM public.report_evidence_passports p
      WHERE p.company_id=NEW.company_id AND p.evidence_snapshot_id=v_snapshot AND p.report_execution_job_id=v_job AND p.source_hash=v_hash
        AND p.verification_status='VERIFIED' AND p.decision_readiness='READY';
    IF v_passport.id IS NULL THEN RAISE EXCEPTION 'SOURCE_DECISION_EVIDENCE_PASSPORT_REQUIRED'; END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_source_decision_evidence ON public.business_intelligence_decisions;
CREATE TRIGGER trg_source_decision_evidence BEFORE INSERT OR UPDATE ON public.business_intelligence_decisions FOR EACH ROW EXECUTE FUNCTION public.enforce_source_decision_evidence();

CREATE OR REPLACE FUNCTION public.enforce_source_work_item_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_catalog' AS $function$
DECLARE v_item jsonb; v_snapshot uuid; v_job uuid; v_hash text; v_type text;
BEGIN
  IF jsonb_typeof(coalesce(NEW.evidence_refs,'[]'::jsonb))='array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(NEW.evidence_refs) LOOP
      v_type:=upper(coalesce(v_item->>'type',''));
      IF v_type='SOURCE_REPORT' THEN
        BEGIN v_snapshot:=nullif(v_item->>'evidenceSnapshotId','')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_snapshot:=NULL; END;
        BEGIN v_job:=nullif(v_item->>'reportExecutionJobId','')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_job:=NULL; END;
        v_hash:=nullif(trim(v_item->>'sourceHash'),'');
        IF v_snapshot IS NULL OR v_job IS NULL OR v_hash IS NULL OR NOT EXISTS (
          SELECT 1 FROM public.report_evidence_passports p
          WHERE p.company_id=NEW.company_id AND p.evidence_snapshot_id=v_snapshot AND p.report_execution_job_id=v_job AND p.source_hash=v_hash
            AND p.verification_status='VERIFIED' AND p.decision_readiness='READY'
        ) THEN
          RAISE EXCEPTION 'SOURCE_WORK_EVIDENCE_PASSPORT_REQUIRED';
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_source_work_item_evidence ON public.decision_work_items;
CREATE TRIGGER trg_source_work_item_evidence BEFORE INSERT OR UPDATE ON public.decision_work_items FOR EACH ROW EXECUTE FUNCTION public.enforce_source_work_item_evidence();

CREATE OR REPLACE FUNCTION public.create_runtime_recommendation(p_category text,p_priority text,p_title text,p_description text default null,p_evidence jsonb default '{}'::jsonb,p_expected_impact numeric default null,p_evidence_snapshot_id uuid default null,p_metric_versions jsonb default '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_catalog' AS $function$
DECLARE v_company uuid:=public.current_company_id(); v_user uuid:=auth.uid(); v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_title IS NULL OR btrim(p_title)='' THEN RAISE EXCEPTION 'RECOMMENDATION_TITLE_REQUIRED'; END IF;
  IF p_evidence_snapshot_id IS NULL THEN RAISE EXCEPTION 'RECOMMENDATION_EVIDENCE_REQUIRED'; END IF;
  IF lower(coalesce(p_category,''))='source-intelligence' THEN
    IF NOT EXISTS (SELECT 1 FROM public.report_evidence_passports p WHERE p.company_id=v_company AND p.evidence_snapshot_id=p_evidence_snapshot_id AND p.verification_status='VERIFIED' AND p.decision_readiness='READY') THEN
      RAISE EXCEPTION 'SOURCE_EVIDENCE_PASSPORT_REQUIRED';
    END IF;
  ELSIF NOT (
    EXISTS (SELECT 1 FROM public.kpi_evidence_snapshots s WHERE s.id=p_evidence_snapshot_id AND s.company_id=v_company)
    OR EXISTS (SELECT 1 FROM public.business_state_snapshots s WHERE s.id=p_evidence_snapshot_id AND s.company_id=v_company)
    OR EXISTS (SELECT 1 FROM public.import_snapshots s WHERE s.id=p_evidence_snapshot_id AND s.company_id=v_company)
    OR EXISTS (SELECT 1 FROM public.operational_health_snapshots s WHERE s.id=p_evidence_snapshot_id AND s.company_id=v_company)
    OR EXISTS (SELECT 1 FROM public.source_analysis_snapshots s WHERE s.id=p_evidence_snapshot_id AND s.company_id=v_company)
  ) THEN RAISE EXCEPTION 'RECOMMENDATION_EVIDENCE_NOT_FOUND_OR_FORBIDDEN'; END IF;
  INSERT INTO public.recommendations(company_id,category,priority,title,description,evidence,expected_impact,confidence,status,evidence_snapshot_id,metric_versions)
  VALUES(v_company,p_category,coalesce(nullif(p_priority,''),'medium'),p_title,p_description,coalesce(p_evidence,'{}'::jsonb),p_expected_impact,'CALCULATED','new',p_evidence_snapshot_id,coalesce(p_metric_versions,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_runtime_recommendation(text,text,text,text,jsonb,numeric,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_runtime_recommendation(text,text,text,text,jsonb,numeric,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_runtime_decision(p_decision_key text,p_decision_type text,p_confidence numeric,p_expected_impact numeric,p_evidence jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_catalog' AS $function$
DECLARE v_company uuid:=public.current_company_id(); v_user uuid:=auth.uid(); v_id uuid;
BEGIN
  IF v_company IS NULL OR v_user IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_decision_key IS NULL OR btrim(p_decision_key)='' THEN RAISE EXCEPTION 'DECISION_KEY_REQUIRED'; END IF;
  IF p_decision_type IS NULL OR btrim(p_decision_type)='' THEN RAISE EXCEPTION 'DECISION_TYPE_REQUIRED'; END IF;
  IF p_confidence IS NOT NULL AND (p_confidence < 0 OR p_confidence > 1) THEN RAISE EXCEPTION 'DECISION_CONFIDENCE_OUT_OF_RANGE'; END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' OR p_evidence='{}'::jsonb THEN RAISE EXCEPTION 'DECISION_EVIDENCE_REQUIRED'; END IF;
  INSERT INTO public.business_intelligence_decisions(company_id,decision_key,decision_type,status,confidence,expected_impact,evidence)
  VALUES(v_company,p_decision_key,p_decision_type,'PROPOSED',p_confidence,p_expected_impact,p_evidence) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_runtime_decision(text,text,numeric,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_runtime_decision(text,text,numeric,numeric,jsonb) TO authenticated;