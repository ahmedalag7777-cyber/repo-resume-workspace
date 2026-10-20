-- Import RPC tenant-context hardening.
-- RPCs derive the tenant from authenticated context and never trust a caller
-- supplied company id. Missing or mismatched context fails closed.

CREATE OR REPLACE FUNCTION public.import_create_job(
  p_company_id uuid,
  p_entity_type text,
  p_total_rows integer DEFAULT 0,
  p_file_record_id uuid DEFAULT NULL,
  p_profile_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_company_id uuid := public.current_company_id();
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF p_company_id IS NOT NULL AND p_company_id <> v_company_id THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;

  INSERT INTO import_jobs(
    company_id, file_record_id, profile_id, job_type, status,
    processing_mode, total_rows, processed_rows, progress,
    result_summary, created_at
  )
  VALUES (
    v_company_id, p_file_record_id, p_profile_id,
    coalesce(p_entity_type, 'import'), 'queued', 'import',
    greatest(coalesce(p_total_rows, 0), 0), 0, 0,
    jsonb_build_object('entity_type', p_entity_type), now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_update_job_progress(
  p_job_id uuid,
  p_processed_rows integer,
  p_valid_rows integer,
  p_invalid_rows integer DEFAULT 0,
  p_duplicate_rows integer DEFAULT 0,
  p_status text DEFAULT 'processing'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_progress integer;
BEGIN
  SELECT total_rows INTO v_total
  FROM import_jobs
  WHERE id = p_job_id AND company_id = public.current_company_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  v_progress := CASE
    WHEN coalesce(v_total, 0) = 0 THEN 0
    ELSE least(100, greatest(0, round((p_processed_rows::numeric / v_total) * 100)))
  END;

  UPDATE import_jobs
  SET processed_rows = greatest(0, p_processed_rows),
      valid_rows = greatest(0, p_valid_rows),
      invalid_rows = greatest(0, p_invalid_rows),
      duplicate_rows = greatest(0, p_duplicate_rows),
      progress = v_progress,
      status = p_status,
      started_at = CASE WHEN started_at IS NULL AND p_status = 'processing' THEN now() ELSE started_at END
  WHERE id = p_job_id AND company_id = public.current_company_id();
END;
$$;

CREATE OR REPLACE FUNCTION public.import_finish_job(
  p_job_id uuid,
  p_status text,
  p_result_summary jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('completed', 'partial', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_IMPORT_TERMINAL_STATUS';
  END IF;

  UPDATE import_jobs
  SET status = p_status,
      progress = CASE WHEN p_status = 'completed' THEN 100 ELSE progress END,
      completed_at = now(),
      duration_ms = CASE WHEN started_at IS NULL THEN duration_ms ELSE extract(epoch from (now() - started_at)) * 1000 END,
      result_summary = coalesce(p_result_summary, '{}'::jsonb),
      error_message = p_error_message
  WHERE id = p_job_id AND company_id = public.current_company_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.import_create_job(uuid, text, integer, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.import_update_job_progress(uuid, integer, integer, integer, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.import_finish_job(uuid, text, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_create_job(uuid, text, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_update_job_progress(uuid, integer, integer, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_finish_job(uuid, text, jsonb, text) TO authenticated;
