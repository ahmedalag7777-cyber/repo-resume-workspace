-- Final import-engine unification: tenant-safe RPCs, idempotent jobs, and atomic product upsert.
-- Keeps legacy signatures for compatibility while routing all writes through canonical tenant context.

ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_import_jobs_company_updated
  ON import_jobs(company_id, updated_at DESC);

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
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  INSERT INTO import_jobs(company_id, file_record_id, profile_id, job_type, entity_type, status, processing_mode, total_rows, processed_rows, progress, result_summary, created_at, updated_at)
  VALUES (v_company_id, p_file_record_id, p_profile_id, COALESCE(p_entity_type,'import'), p_entity_type, 'queued', 'import', GREATEST(COALESCE(p_total_rows,0),0), 0, 0, jsonb_build_object('entity_type',p_entity_type), now(), now())
  RETURNING id INTO v_job_id;
  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION import_create_job(
  p_company_id uuid,
  p_entity_type text,
  p_total_rows integer,
  p_file_record_id uuid,
  p_profile_id uuid,
  p_idempotency_key text,
  p_source_fingerprint text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_company_id uuid := public.current_company_id();
  v_job_id uuid;
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF NULLIF(trim(p_idempotency_key),'') IS NULL THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED'; END IF;
  SELECT id INTO v_job_id FROM import_jobs WHERE company_id=v_company_id AND idempotency_key=trim(p_idempotency_key) LIMIT 1;
  IF v_job_id IS NOT NULL THEN RETURN v_job_id; END IF;
  INSERT INTO import_jobs(company_id,file_record_id,profile_id,job_type,entity_type,status,processing_mode,total_rows,processed_rows,progress,result_summary,idempotency_key,source_fingerprint,created_at,updated_at)
  VALUES(v_company_id,p_file_record_id,p_profile_id,COALESCE(p_entity_type,'import'),p_entity_type,'queued','import',GREATEST(COALESCE(p_total_rows,0),0),0,0,jsonb_build_object('entity_type',p_entity_type),trim(p_idempotency_key),NULLIF(trim(p_source_fingerprint),''),now(),now())
  ON CONFLICT (company_id,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_job_id;
  IF v_job_id IS NULL THEN SELECT id INTO v_job_id FROM import_jobs WHERE company_id=v_company_id AND idempotency_key=trim(p_idempotency_key) LIMIT 1; END IF;
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
DECLARE v_total integer; v_company_id uuid := public.current_company_id();
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  SELECT total_rows INTO v_total FROM import_jobs WHERE id=p_job_id AND company_id=v_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN'; END IF;
  UPDATE import_jobs SET processed_rows=GREATEST(0,p_processed_rows),valid_rows=GREATEST(0,p_valid_rows),invalid_rows=GREATEST(0,p_invalid_rows),duplicate_rows=GREATEST(0,p_duplicate_rows),progress=CASE WHEN COALESCE(v_total,0)=0 THEN 0 ELSE LEAST(100,GREATEST(0,ROUND((GREATEST(0,p_processed_rows)::numeric/v_total)*100))) END,status=p_status,started_at=CASE WHEN started_at IS NULL AND p_status='processing' THEN now() ELSE started_at END,updated_at=now() WHERE id=p_job_id AND company_id=v_company_id;
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
  IF public.current_company_id() IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  UPDATE import_jobs SET status=p_status,progress=CASE WHEN p_status='completed' THEN 100 ELSE progress END,completed_at=CASE WHEN p_status IN ('completed','partial','failed','cancelled','quarantined') THEN now() ELSE completed_at END,duration_ms=CASE WHEN started_at IS NULL THEN duration_ms ELSE extract(epoch from(now()-started_at))*1000 END,result_summary=COALESCE(p_result_summary,'{}'::jsonb),error_message=p_error_message,updated_at=now() WHERE id=p_job_id AND company_id=public.current_company_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION import_upsert_product(
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
DECLARE v_company_id uuid := public.current_company_id(); v_id uuid; v_sku text := normalize_import_key(p_sku);
BEGIN
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_company_id IS DISTINCT FROM v_company_id THEN RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH'; END IF;
  IF v_sku IS NULL THEN RAISE EXCEPTION 'SKU_REQUIRED'; END IF;
  SELECT id INTO v_id FROM products WHERE company_id=v_company_id AND normalize_import_key(sku)=v_sku LIMIT 1 FOR UPDATE;
  IF v_id IS NULL THEN
    INSERT INTO products(company_id,sku,name,unit,cost_price,selling_price,min_stock,reorder_point)
    VALUES(v_company_id,trim(p_sku),COALESCE(p_name,''),COALESCE(p_unit,'قطعة'),COALESCE(p_cost_price,0),COALESCE(p_selling_price,0),COALESCE(p_min_stock,0),COALESCE(p_reorder_point,0))
    RETURNING id INTO v_id;
    RETURN QUERY SELECT v_id,'inserted'::text; RETURN;
  END IF;
  UPDATE products SET name=CASE WHEN p_null_policy='preserve' AND p_name IS NULL THEN name ELSE COALESCE(p_name,name) END,unit=CASE WHEN p_null_policy='preserve' AND p_unit IS NULL THEN unit ELSE COALESCE(p_unit,unit) END,cost_price=CASE WHEN p_null_policy='preserve' AND p_cost_price IS NULL THEN cost_price ELSE COALESCE(p_cost_price,cost_price) END,selling_price=CASE WHEN p_null_policy='preserve' AND p_selling_price IS NULL THEN selling_price ELSE COALESCE(p_selling_price,selling_price) END,min_stock=CASE WHEN p_null_policy='preserve' AND p_min_stock IS NULL THEN min_stock ELSE COALESCE(p_min_stock,min_stock) END,reorder_point=CASE WHEN p_null_policy='preserve' AND p_reorder_point IS NULL THEN reorder_point ELSE COALESCE(p_reorder_point,reorder_point) END WHERE id=v_id AND company_id=v_company_id;
  RETURN QUERY SELECT v_id,'updated'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION import_create_job(uuid,text,integer,uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION import_create_job(uuid,text,integer,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION import_update_job_progress(uuid,integer,integer,integer,integer,text) FROM anon;
REVOKE EXECUTE ON FUNCTION import_finish_job(uuid,text,jsonb,text) FROM anon;
REVOKE EXECUTE ON FUNCTION import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text) FROM anon;
GRANT EXECUTE ON FUNCTION import_create_job(uuid,text,integer,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION import_create_job(uuid,text,integer,uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION import_update_job_progress(uuid,integer,integer,integer,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION import_finish_job(uuid,text,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text) TO authenticated;

COMMENT ON FUNCTION import_upsert_product(uuid,text,text,text,numeric,numeric,numeric,numeric,text) IS 'Canonical tenant-scoped product import primitive; client company_id is validated against current_company_id().';
