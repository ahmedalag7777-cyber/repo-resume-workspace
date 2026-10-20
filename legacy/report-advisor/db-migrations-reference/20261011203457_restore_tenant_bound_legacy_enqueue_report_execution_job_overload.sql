-- Restore the stable six-argument normal-enqueue API without reintroducing overload ambiguity.
CREATE OR REPLACE FUNCTION public.enqueue_report_execution_job(
  p_company_id uuid,
  p_job_key text,
  p_source_path text,
  p_source_hash text,
  p_evidence_keys text[] DEFAULT '{}'::text[],
  p_max_attempts integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT public.enqueue_report_execution_job(
    p_company_id,
    p_job_key,
    p_source_path,
    p_source_hash,
    p_evidence_keys,
    p_max_attempts,
    false
  );
$function$;

REVOKE ALL ON FUNCTION public.enqueue_report_execution_job(uuid, text, text, text, text[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_report_execution_job(uuid, text, text, text, text[], integer) TO authenticated, service_role;
