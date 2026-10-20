-- Final import lifecycle hardening.
-- Canonical state machine: finish RPC accepts terminal states only,
-- preserves existing lineage, and fails closed on inconsistent error state.

CREATE OR REPLACE FUNCTION public.import_finish_job(
  p_job_id uuid,
  p_status text,
  p_result_summary jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_existing_status text;
  v_existing_summary jsonb;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF p_status NOT IN ('completed', 'partial', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'IMPORT_TERMINAL_STATUS_REQUIRED';
  END IF;

  IF p_status = 'completed' AND p_error_message IS NOT NULL AND length(trim(p_error_message)) > 0 THEN
    RAISE EXCEPTION 'IMPORT_COMPLETED_WITH_ERROR_FORBIDDEN';
  END IF;

  SELECT status, coalesce(result_summary, '{}'::jsonb)
    INTO v_existing_status, v_existing_summary
  FROM public.import_jobs
  WHERE id = p_job_id AND company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  UPDATE public.import_jobs
  SET status = p_status,
      progress = CASE WHEN p_status = 'completed' THEN 100 ELSE progress END,
      completed_at = now(),
      duration_ms = CASE WHEN started_at IS NULL THEN duration_ms ELSE extract(epoch from (now() - started_at)) * 1000 END,
      result_summary = v_existing_summary || coalesce(p_result_summary, '{}'::jsonb),
      error_message = CASE
        WHEN p_status = 'completed' THEN NULL
        ELSE p_error_message
      END
  WHERE id = p_job_id AND company_id = v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) TO authenticated;
