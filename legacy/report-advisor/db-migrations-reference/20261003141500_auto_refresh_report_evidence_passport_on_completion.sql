-- Automatically establish the Evidence Passport at durable report completion.
-- Refresh failure is persisted as a real pending state; it never fabricates verification.
CREATE OR REPLACE FUNCTION public.complete_report_execution_job(
  p_job_id uuid,
  p_company_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  affected integer;
  v_company_id uuid := public.current_company_id();
  v_is_service_role boolean := COALESCE(auth.jwt()->>'role','') = 'service_role';
  v_passport_result jsonb;
  v_passport_error text;
BEGIN
  IF NOT v_is_service_role AND (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATED_USER_REQUIRED';
  END IF;
  IF p_company_id IS NULL OR p_job_id IS NULL OR p_worker_id IS NULL OR p_lease_token IS NULL THEN
    RAISE EXCEPTION 'REPORT_EXECUTION_COMPLETE_INPUT_INVALID';
  END IF;
  IF NOT v_is_service_role AND (v_company_id IS NULL OR p_company_id IS DISTINCT FROM v_company_id) THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' THEN
    RAISE EXCEPTION 'REPORT_EXECUTION_COMPLETION_EVIDENCE_INVALID';
  END IF;

  UPDATE public.report_execution_jobs
  SET status='completed',
      evidence=coalesce(p_evidence,'{}'::jsonb),
      completed_at=clock_timestamp(),
      updated_at=clock_timestamp(),
      lease_owner=null,
      lease_token=null,
      lease_expires_at=null
  WHERE id=p_job_id
    AND company_id=p_company_id
    AND lease_owner=p_worker_id
    AND lease_token=p_lease_token
    AND lease_expires_at>clock_timestamp()
    AND status IN ('leased','processing')
    AND checkpoint->>'stage'='rendered';

  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected <> 1 THEN
    RETURN false;
  END IF;

  IF (
    SELECT count(*)
    FROM public.report_execution_tasks
    WHERE company_id=p_company_id AND report_execution_job_id=p_job_id
  ) <> 9 THEN
    RAISE EXCEPTION 'REPORT_EXECUTION_TASK_LEDGER_INCOMPLETE';
  END IF;

  UPDATE public.report_execution_tasks
  SET status='completed',
      attempt=GREATEST(attempt,1),
      started_at=COALESCE(started_at,clock_timestamp()),
      completed_at=COALESCE(completed_at,clock_timestamp()),
      evidence=coalesce(evidence,'{}'::jsonb) ||
        jsonb_build_object('completionEvidence',coalesce(p_evidence,'{}'::jsonb),'ledgerUpdatedAt',clock_timestamp()),
      last_error='{}'::jsonb,
      updated_at=clock_timestamp()
  WHERE company_id=p_company_id AND report_execution_job_id=p_job_id;

  IF (
    SELECT count(*)
    FROM public.report_execution_tasks
    WHERE company_id=p_company_id AND report_execution_job_id=p_job_id AND status='completed'
  ) <> 9 THEN
    RAISE EXCEPTION 'REPORT_EXECUTION_TASK_LEDGER_COMPLETION_FAILED';
  END IF;

  BEGIN
    v_passport_result := public.refresh_report_evidence_passport(p_company_id,p_job_id);
    UPDATE public.report_execution_jobs
       SET evidence = coalesce(evidence,'{}'::jsonb)
         || jsonb_build_object(
              'evidencePassportRefresh',
              jsonb_build_object(
                'status','COMPLETED',
                'result',v_passport_result
              )
            ),
           updated_at=clock_timestamp()
     WHERE id=p_job_id AND company_id=p_company_id;
  EXCEPTION WHEN OTHERS THEN
    v_passport_error := SQLERRM;
    UPDATE public.report_execution_jobs
       SET evidence = coalesce(evidence,'{}'::jsonb)
         || jsonb_build_object(
              'evidencePassportRefresh',
              jsonb_build_object(
                'status','PENDING',
                'error',v_passport_error
              )
            ),
           updated_at=clock_timestamp()
     WHERE id=p_job_id AND company_id=p_company_id;
  END;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_report_execution_job(uuid,uuid,text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_report_execution_job(uuid,uuid,text,uuid,jsonb) TO authenticated, service_role;
