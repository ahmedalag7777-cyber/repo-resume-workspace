-- Prevent import progress counters from moving backwards when concurrent or stale workers report an older snapshot.
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_total integer;
  v_existing_processed integer;
  v_existing_valid integer;
  v_existing_invalid integer;
  v_existing_duplicate integer;
  v_processed integer;
  v_valid integer;
  v_invalid integer;
  v_duplicate integer;
  v_status text := COALESCE(NULLIF(trim(p_status), ''), 'processing');
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF v_status NOT IN ('queued','processing') THEN
    RAISE EXCEPTION 'IMPORT_NON_TERMINAL_STATUS_REQUIRED';
  END IF;

  SELECT total_rows, processed_rows, valid_rows, invalid_rows, duplicate_rows
    INTO v_total, v_existing_processed, v_existing_valid, v_existing_invalid, v_existing_duplicate
  FROM public.import_jobs
  WHERE id = p_job_id AND company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  v_processed := GREATEST(
    COALESCE(v_existing_processed, 0),
    LEAST(GREATEST(COALESCE(p_processed_rows, 0), 0), GREATEST(COALESCE(v_total, 0), 0))
  );
  v_valid := GREATEST(
    COALESCE(v_existing_valid, 0),
    LEAST(GREATEST(COALESCE(p_valid_rows, 0), 0), v_processed)
  );
  v_invalid := GREATEST(
    COALESCE(v_existing_invalid, 0),
    LEAST(GREATEST(COALESCE(p_invalid_rows, 0), 0), v_processed)
  );
  v_duplicate := GREATEST(
    COALESCE(v_existing_duplicate, 0),
    LEAST(GREATEST(COALESCE(p_duplicate_rows, 0), 0), v_processed)
  );

  UPDATE public.import_jobs
  SET status = v_status,
      processed_rows = v_processed,
      valid_rows = v_valid,
      invalid_rows = v_invalid,
      duplicate_rows = v_duplicate,
      progress = CASE
        WHEN COALESCE(v_total, 0) > 0
          THEN LEAST(100, GREATEST(0, round(v_processed::numeric / v_total::numeric * 100)::integer))
        ELSE 0
      END,
      started_at = COALESCE(started_at, now())
  WHERE id = p_job_id AND company_id = v_company_id;
END;
$function$;
