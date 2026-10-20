-- Re-enable import RPCs only through canonical tenant context.
-- The client-supplied company id is accepted for backward-compatible signatures
-- but is never trusted; it must equal current_company_id().

CREATE OR REPLACE FUNCTION import_create_job(
  p_company_id uuid,
  p_entity_type text,
  p_total_rows integer DEFAULT 0,
  p_file_record_id uuid DEFAULT NULL,
  p_profile_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_job_id uuid;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;
  INSERT INTO import_jobs(company_id, entity_type, total_rows, file_record_id, profile_id, status)
  VALUES (v_company_id, p_entity_type, COALESCE(p_total_rows,0), p_file_record_id, p_profile_id, 'pending')
  RETURNING id INTO v_job_id;
  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION import_update_job_progress(
  p_job_id uuid,
  p_processed_rows integer,
  p_valid_rows integer,
  p_invalid_rows integer DEFAULT 0,
  p_duplicate_rows integer DEFAULT 0,
  p_status text DEFAULT 'processing'
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE import_jobs
  SET processed_rows = GREATEST(0,p_processed_rows),
      valid_rows = GREATEST(0,p_valid_rows),
      invalid_rows = GREATEST(0,p_invalid_rows),
      duplicate_rows = GREATEST(0,p_duplicate_rows),
      status = p_status,
      updated_at = now()
  WHERE id = p_job_id
    AND company_id = public.current_company_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION import_finish_job(
  p_job_id uuid,
  p_status text,
  p_result_summary jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE import_jobs
  SET status = p_status,
      result_summary = COALESCE(p_result_summary,'{}'::jsonb),
      error_message = p_error_message,
      completed_at = CASE WHEN p_status IN ('completed','failed','cancelled','quarantined') THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE id = p_job_id
    AND company_id = public.current_company_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION import_create_job(uuid,text,integer,uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION import_update_job_progress(uuid,integer,integer,integer,integer,text) FROM anon;
REVOKE EXECUTE ON FUNCTION import_finish_job(uuid,text,jsonb,text) FROM anon;
GRANT EXECUTE ON FUNCTION import_create_job(uuid,text,integer,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION import_update_job_progress(uuid,integer,integer,integer,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION import_finish_job(uuid,text,jsonb,text) TO authenticated;

COMMENT ON FUNCTION import_create_job(uuid,text,integer,uuid,uuid) IS 'Tenant-scoped import creation; p_company_id must equal current_company_id().';
COMMENT ON FUNCTION import_update_job_progress(uuid,integer,integer,integer,integer,text) IS 'Tenant-scoped import progress update.';
COMMENT ON FUNCTION import_finish_job(uuid,text,jsonb,text) IS 'Tenant-scoped import finalization.';
