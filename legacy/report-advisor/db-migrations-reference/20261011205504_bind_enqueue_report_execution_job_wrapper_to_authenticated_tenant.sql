-- Bind the authenticated normal-enqueue wrapper to the caller's tenant itself.
-- Keep the service-only seven-argument force-reprocess implementation unchanged.
CREATE OR REPLACE FUNCTION public.enqueue_report_execution_job(
  p_company_id uuid,
  p_job_key text,
  p_source_path text,
  p_source_hash text,
  p_evidence_keys text[] DEFAULT '{}'::text[],
  p_max_attempts integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_is_service_role boolean := coalesce(auth.jwt()->>'role', '') = 'service_role';
  v_company_id uuid;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  IF NOT v_is_service_role THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'AUTHENTICATED_USER_REQUIRED';
    END IF;

    v_company_id := public.current_company_id();
    IF v_company_id IS NULL OR p_company_id IS DISTINCT FROM v_company_id THEN
      RAISE EXCEPTION 'TENANT_CONTEXT_MISMATCH';
    END IF;
  END IF;

  RETURN public.enqueue_report_execution_job(
    p_company_id,
    p_job_key,
    p_source_path,
    p_source_hash,
    p_evidence_keys,
    p_max_attempts,
    false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_report_execution_job(uuid, text, text, text, text[], integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_report_execution_job(uuid, text, text, text, text[], integer) TO authenticated, service_role;
