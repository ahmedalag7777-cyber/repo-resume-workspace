-- Restore the missing canonical import lifecycle RPCs consumed by the existing import adapters.
-- The repository contained the client contract and the canonical terminal RPC,
-- but no migration defining create/update. This migration restores that missing
-- contract without changing import architecture or tenant authority.

CREATE OR REPLACE FUNCTION public.import_create_job(
  p_company_id uuid,
  p_entity_type text DEFAULT 'import',
  p_total_rows integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_id uuid;
BEGIN
  IF v_company_id IS NULL OR p_company_id IS NULL OR p_company_id <> v_company_id THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;
  IF p_total_rows < 0 THEN
    RAISE EXCEPTION 'IMPORT_TOTAL_ROWS_INVALID';
  END IF;

  INSERT INTO public.import_jobs(
    company_id, job_type, processing_mode, status, total_rows, processed_rows,
    valid_rows, invalid_rows, quarantined_rows, duplicate_rows, progress,
    started_at, result_summary
  )
  VALUES (
    v_company_id, COALESCE(NULLIF(trim(p_entity_type), ''), 'import'), 'import', 'processing',
    p_total_rows, 0, 0, 0, 0, 0, 0, now(), '{}'::jsonb
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
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_total integer;
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

  SELECT total_rows INTO v_total
  FROM public.import_jobs
  WHERE id=p_job_id AND company_id=v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  v_processed := LEAST(GREATEST(COALESCE(p_processed_rows,0),0),GREATEST(COALESCE(v_total,0),0));
  v_valid := LEAST(GREATEST(COALESCE(p_valid_rows,0),0),v_processed);
  v_invalid := LEAST(GREATEST(COALESCE(p_invalid_rows,0),0),v_processed);
  v_duplicate := LEAST(GREATEST(COALESCE(p_duplicate_rows,0),0),v_processed);

  UPDATE public.import_jobs
  SET status=v_status,
      processed_rows=v_processed,
      valid_rows=v_valid,
      invalid_rows=v_invalid,
      duplicate_rows=v_duplicate,
      progress=CASE WHEN COALESCE(v_total,0)>0 THEN LEAST(100,GREATEST(0,round(v_processed::numeric/v_total::numeric*100)::integer)) ELSE 0 END,
      started_at=COALESCE(started_at,now())
  WHERE id=p_job_id AND company_id=v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.import_create_job(uuid,text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_update_job_progress(uuid,integer,integer,integer,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_create_job(uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_update_job_progress(uuid,integer,integer,integer,integer,text) TO authenticated;
