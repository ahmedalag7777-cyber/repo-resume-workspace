-- Canonical tenant-aware import RPCs.
-- Replaces the temporary fail-closed stubs once the membership resolver exists.
-- SECURITY INVOKER + explicit tenant checks + RLS provide defense in depth.

CREATE OR REPLACE FUNCTION public.import_create_job(
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
  v_id uuid;
  v_company_id uuid := public.current_company_id();
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;

  INSERT INTO public.import_jobs(
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
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_total integer;
  v_progress integer;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  SELECT total_rows INTO v_total
  FROM public.import_jobs
  WHERE id = p_job_id AND company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  v_progress := CASE
    WHEN coalesce(v_total, 0) = 0 THEN 0
    ELSE least(100, greatest(0, round((greatest(p_processed_rows, 0)::numeric / v_total) * 100)))
  END;

  UPDATE public.import_jobs
  SET processed_rows = greatest(0, p_processed_rows),
      valid_rows = greatest(0, p_valid_rows),
      invalid_rows = greatest(0, p_invalid_rows),
      duplicate_rows = greatest(0, p_duplicate_rows),
      progress = v_progress,
      status = p_status,
      started_at = CASE WHEN started_at IS NULL AND p_status = 'processing' THEN now() ELSE started_at END
  WHERE id = p_job_id AND company_id = v_company_id;
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
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;

  UPDATE public.import_jobs
  SET status = p_status,
      progress = CASE WHEN p_status = 'completed' THEN 100 ELSE progress END,
      completed_at = CASE WHEN p_status IN ('completed','partial','failed','cancelled') THEN now() ELSE completed_at END,
      duration_ms = CASE WHEN started_at IS NULL THEN duration_ms ELSE extract(epoch from (now() - started_at)) * 1000 END,
      result_summary = coalesce(p_result_summary, '{}'::jsonb),
      error_message = p_error_message
  WHERE id = p_job_id AND company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_upsert_product(
  p_company_id uuid,
  p_sku text,
  p_name text,
  p_unit text DEFAULT NULL,
  p_cost_price numeric DEFAULT NULL,
  p_selling_price numeric DEFAULT NULL,
  p_min_stock numeric DEFAULT NULL,
  p_reorder_point numeric DEFAULT NULL,
  p_null_policy text DEFAULT 'preserve'
)
RETURNS TABLE(target_id uuid, action text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_id uuid;
  v_sku text := public.normalize_import_key(p_sku);
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED';
  END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
  END IF;
  IF v_sku IS NULL THEN
    RAISE EXCEPTION 'SKU is required';
  END IF;

  SELECT id INTO v_id
  FROM public.products
  WHERE company_id = v_company_id
    AND public.normalize_import_key(sku) = v_sku
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    INSERT INTO public.products(company_id, sku, name, unit, cost_price, selling_price, min_stock, reorder_point)
    VALUES (
      v_company_id, trim(p_sku), coalesce(p_name, ''), coalesce(p_unit, 'قطعة'),
      coalesce(p_cost_price, 0), coalesce(p_selling_price, 0),
      coalesce(p_min_stock, 0), coalesce(p_reorder_point, 0)
    )
    RETURNING id INTO v_id;
    RETURN QUERY SELECT v_id, 'inserted'::text;
    RETURN;
  END IF;

  UPDATE public.products
  SET name = CASE WHEN p_null_policy = 'preserve' AND p_name IS NULL THEN name ELSE coalesce(p_name, name) END,
      unit = CASE WHEN p_null_policy = 'preserve' AND p_unit IS NULL THEN unit ELSE coalesce(p_unit, unit) END,
      cost_price = CASE WHEN p_null_policy = 'preserve' AND p_cost_price IS NULL THEN cost_price ELSE coalesce(p_cost_price, cost_price) END,
      selling_price = CASE WHEN p_null_policy = 'preserve' AND p_selling_price IS NULL THEN selling_price ELSE coalesce(p_selling_price, selling_price) END,
      min_stock = CASE WHEN p_null_policy = 'preserve' AND p_min_stock IS NULL THEN min_stock ELSE coalesce(p_min_stock, min_stock) END,
      reorder_point = CASE WHEN p_null_policy = 'preserve' AND p_reorder_point IS NULL THEN reorder_point ELSE coalesce(p_reorder_point, reorder_point) END
  WHERE id = v_id AND company_id = v_company_id;

  RETURN QUERY SELECT v_id, 'updated'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.import_create_job(uuid,text,integer,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_update_job_progress(uuid,integer,integer,integer,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.import_create_job(uuid,text,integer,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_update_job_progress(uuid,integer,integer,integer,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_finish_job(uuid,text,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text) TO authenticated;
