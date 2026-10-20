-- Fail closed on import terminal-state transitions.
-- Reuses the canonical import job RPC; no parallel import engine is introduced.
-- Prevents non-terminal statuses from entering import_finish_job and preserves
-- existing result_summary metadata (for example file lineage) on finalization.

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
  v_existing_summary jsonb;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  IF p_status NOT IN ('completed', 'partial', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'IMPORT_TERMINAL_STATUS_REQUIRED';
  END IF;

  IF p_status = 'completed' AND p_error_message IS NOT NULL THEN
    RAISE EXCEPTION 'IMPORT_COMPLETED_WITH_ERROR';
  END IF;

  SELECT result_summary
    INTO v_existing_summary
  FROM public.import_jobs
  WHERE id = p_job_id
    AND company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  UPDATE public.import_jobs
  SET status = p_status,
      progress = CASE WHEN p_status = 'completed' THEN 100 ELSE progress END,
      completed_at = now(),
      duration_ms = CASE
        WHEN started_at IS NULL THEN duration_ms
        ELSE extract(epoch FROM (now() - started_at)) * 1000
      END,
      result_summary = coalesce(v_existing_summary, '{}'::jsonb) || coalesce(p_result_summary, '{}'::jsonb),
      error_message = p_error_message
  WHERE id = p_job_id
    AND company_id = v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) TO authenticated;
