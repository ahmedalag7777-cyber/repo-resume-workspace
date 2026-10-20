-- Unified import job primitives.
-- Keeps import state and row outcomes durable and auditable.

CREATE OR REPLACE FUNCTION import_create_job(
  p_company_id uuid,
  p_entity_type text,
  p_total_rows integer DEFAULT 0,
  p_file_record_id uuid DEFAULT NULL,
  p_profile_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO import_jobs(company_id, file_record_id, profile_id, job_type, status, processing_mode, total_rows, processed_rows, progress, result_summary, created_at)
  VALUES (p_company_id, p_file_record_id, p_profile_id, coalesce(p_entity_type, 'import'), 'queued', 'import', greatest(p_total_rows, 0), 0, 0, jsonb_build_object('entity_type', p_entity_type), now())
  RETURNING id INTO v_id;
  RETURN v_id;
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
AS $$
DECLARE v_total integer; v_progress integer;
BEGIN
  SELECT total_rows INTO v_total FROM import_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Import job not found: %', p_job_id; END IF;
  v_progress := CASE WHEN coalesce(v_total,0) = 0 THEN 0 ELSE least(100, greatest(0, round((p_processed_rows::numeric / v_total) * 100))) END;
  UPDATE import_jobs
  SET processed_rows = greatest(0,p_processed_rows),
      valid_rows = greatest(0,p_valid_rows),
      invalid_rows = greatest(0,p_invalid_rows),
      duplicate_rows = greatest(0,p_duplicate_rows),
      progress = v_progress,
      status = p_status,
      started_at = CASE WHEN started_at IS NULL AND p_status = 'processing' THEN now() ELSE started_at END
  WHERE id = p_job_id;
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
AS $$
BEGIN
  UPDATE import_jobs
  SET status = p_status,
      progress = CASE WHEN p_status = 'completed' THEN 100 ELSE progress END,
      completed_at = CASE WHEN p_status IN ('completed','partial','failed','cancelled') THEN now() ELSE completed_at END,
      duration_ms = CASE WHEN started_at IS NULL THEN duration_ms ELSE extract(epoch from (now()-started_at))*1000 END,
      result_summary = coalesce(p_result_summary, '{}'::jsonb),
      error_message = p_error_message
  WHERE id = p_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Import job not found: %', p_job_id; END IF;
END;
$$;
