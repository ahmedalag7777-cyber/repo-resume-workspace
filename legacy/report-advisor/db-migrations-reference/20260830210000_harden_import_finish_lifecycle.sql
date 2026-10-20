-- Close the canonical import terminal-state lifecycle gap.
-- A terminal job must not be resurrected or finalized by a mismatched tenant.

CREATE OR REPLACE FUNCTION public.import_finish_job(
  p_job_id uuid,
  p_status text,
  p_result_summary jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_job_company_id uuid;
  v_current_status text;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF p_status NOT IN ('completed','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'IMPORT_TERMINAL_STATUS_REQUIRED';
  END IF;

  SELECT company_id, status
    INTO v_job_company_id, v_current_status
  FROM public.import_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND OR v_job_company_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  IF v_current_status IN ('completed','partial','failed','cancelled') THEN
    RAISE EXCEPTION 'IMPORT_JOB_ALREADY_TERMINAL';
  END IF;

  UPDATE public.import_jobs
  SET status = p_status,
      progress = CASE WHEN p_status = 'completed' THEN 100 ELSE progress END,
      completed_at = now(),
      duration_ms = CASE
        WHEN started_at IS NULL THEN duration_ms
        ELSE extract(epoch from (now() - started_at)) * 1000
      END,
      result_summary = coalesce(p_result_summary, '{}'::jsonb),
      error_message = p_error_message
  WHERE id = p_job_id
    AND company_id = v_company_id
    AND status IN ('queued','processing');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;
END;
$$;

ALTER FUNCTION public.import_finish_job(uuid,text,jsonb,text) SET search_path = public;
REVOKE ALL ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) TO authenticated;
