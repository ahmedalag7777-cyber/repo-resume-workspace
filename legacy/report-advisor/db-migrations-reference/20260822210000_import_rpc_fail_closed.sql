-- Fail-closed RPC authorization until a canonical membership resolver exists.
-- Never trust a client-supplied company_id for authenticated import RPCs.
-- These functions intentionally reject execution rather than guessing tenant membership.

REVOKE EXECUTE ON FUNCTION import_create_job(uuid, text, integer, uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION import_update_job_progress(uuid, integer, integer, integer, integer, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION import_finish_job(uuid, text, jsonb, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION import_upsert_product(uuid, text, text, text, numeric, numeric, numeric, numeric, text) FROM authenticated;

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
BEGIN
  RAISE EXCEPTION 'IMPORT_RPC_TENANT_AUTH_NOT_CONFIGURED';
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
  RAISE EXCEPTION 'IMPORT_RPC_TENANT_AUTH_NOT_CONFIGURED';
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
  RAISE EXCEPTION 'IMPORT_RPC_TENANT_AUTH_NOT_CONFIGURED';
END;
$$;

COMMENT ON FUNCTION import_create_job(uuid,text,integer,uuid,uuid) IS 'Fail-closed until canonical tenant membership resolver is installed.';
COMMENT ON FUNCTION import_update_job_progress(uuid,integer,integer,integer,integer,text) IS 'Fail-closed until canonical tenant membership resolver is installed.';
COMMENT ON FUNCTION import_finish_job(uuid,text,jsonb,text) IS 'Fail-closed until canonical tenant membership resolver is installed.';
