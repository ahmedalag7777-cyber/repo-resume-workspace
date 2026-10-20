-- Harden source Evidence Passport trigger gates with explicit actor and tenant semantics.
-- Authenticated callers must bind the row to current_company_id(); service_role is the
-- only explicit privileged path and remains subject to Passport/company/source matching.

CREATE OR REPLACE FUNCTION public.enforce_source_recommendation_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path='public','pg_catalog'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role text := coalesce(auth.jwt()->>'role','');
  v_company uuid := public.current_company_id();
BEGIN
  IF v_role = 'authenticated' THEN
    IF v_user IS NULL OR v_company IS NULL OR NEW.company_id IS DISTINCT FROM v_company THEN
      RAISE EXCEPTION 'SOURCE_RECOMMENDATION_TENANT_CONTEXT_REQUIRED';
    END IF;
  ELSIF v_role <> 'service_role' THEN
    RAISE EXCEPTION 'SOURCE_RECOMMENDATION_AUTHORITY_REQUIRED';
  END IF;

  IF lower(coalesce(NEW.category,''))='source-intelligence' THEN
    IF NEW.evidence_snapshot_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.report_evidence_passports p
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

CREATE OR REPLACE FUNCTION public.enforce_source_decision_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path='public','pg_catalog'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role text := coalesce(auth.jwt()->>'role','');
  v_company uuid := public.current_company_id();
  v_snapshot uuid;
  v_hash text;
  v_job uuid;
  v_passport public.report_evidence_passports%ROWTYPE;
BEGIN
  IF v_role = 'authenticated' THEN
    IF v_user IS NULL OR v_company IS NULL OR NEW.company_id IS DISTINCT FROM v_company THEN
      RAISE EXCEPTION 'SOURCE_DECISION_TENANT_CONTEXT_REQUIRED';
    END IF;
  ELSIF v_role <> 'service_role' THEN
    RAISE EXCEPTION 'SOURCE_DECISION_AUTHORITY_REQUIRED';
  END IF;

  IF upper(coalesce(NEW.decision_type,''))='SOURCE_INTELLIGENCE_SIGNAL' THEN
    BEGIN
      v_snapshot:=nullif(NEW.evidence->>'evidenceSnapshotId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_snapshot:=NULL;
    END;
    BEGIN
      v_job:=nullif(NEW.evidence->>'reportExecutionJobId','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_job:=NULL;
    END;
    v_hash:=nullif(trim(NEW.evidence->>'sourceHash'),'');
    IF v_snapshot IS NULL OR v_job IS NULL OR v_hash IS NULL THEN
      RAISE EXCEPTION 'SOURCE_DECISION_EVIDENCE_PASSPORT_REQUIRED';
    END IF;

    SELECT *
      INTO v_passport
      FROM public.report_evidence_passports p
      WHERE p.company_id=NEW.company_id
        AND p.evidence_snapshot_id=v_snapshot
        AND p.report_execution_job_id=v_job
        AND p.source_hash=v_hash
        AND p.verification_status='VERIFIED'
        AND p.decision_readiness='READY';

    IF v_passport.id IS NULL THEN
      RAISE EXCEPTION 'SOURCE_DECISION_EVIDENCE_PASSPORT_REQUIRED';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_source_work_item_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path='public','pg_catalog'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role text := coalesce(auth.jwt()->>'role','');
  v_company uuid := public.current_company_id();
  v_item jsonb;
  v_snapshot uuid;
  v_job uuid;
  v_hash text;
  v_type text;
BEGIN
  IF v_role = 'authenticated' THEN
    IF v_user IS NULL OR v_company IS NULL OR NEW.company_id IS DISTINCT FROM v_company THEN
      RAISE EXCEPTION 'SOURCE_WORK_TENANT_CONTEXT_REQUIRED';
    END IF;
  ELSIF v_role <> 'service_role' THEN
    RAISE EXCEPTION 'SOURCE_WORK_AUTHORITY_REQUIRED';
  END IF;

  IF jsonb_typeof(coalesce(NEW.evidence_refs,'[]'::jsonb))='array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(NEW.evidence_refs) LOOP
      v_type:=upper(coalesce(v_item->>'type',''));
      IF v_type='SOURCE_REPORT' THEN
        BEGIN
          v_snapshot:=nullif(v_item->>'evidenceSnapshotId','')::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
          v_snapshot:=NULL;
        END;
        BEGIN
          v_job:=nullif(v_item->>'reportExecutionJobId','')::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
          v_job:=NULL;
        END;
        v_hash:=nullif(trim(v_item->>'sourceHash'),'');
        IF v_snapshot IS NULL
           OR v_job IS NULL
           OR v_hash IS NULL
           OR NOT EXISTS (
             SELECT 1
             FROM public.report_evidence_passports p
             WHERE p.company_id=NEW.company_id
               AND p.evidence_snapshot_id=v_snapshot
               AND p.report_execution_job_id=v_job
               AND p.source_hash=v_hash
               AND p.verification_status='VERIFIED'
               AND p.decision_readiness='READY'
           ) THEN
          RAISE EXCEPTION 'SOURCE_WORK_EVIDENCE_PASSPORT_REQUIRED';
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
