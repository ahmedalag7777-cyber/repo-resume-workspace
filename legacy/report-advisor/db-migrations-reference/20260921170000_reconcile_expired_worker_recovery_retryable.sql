-- Forward-only reconciliation: keep expired worker recovery behavior aligned with
-- the live Staging contract. Retryable expired leases return to queued; exhausted
-- attempts become dead_letter. Historical migrations remain untouched.

CREATE OR REPLACE FUNCTION public.recover_expired_report_execution_jobs(
  p_company_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  affected integer;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Worker company context is required';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'Recovery limit must be between 1 and 1000';
  END IF;

  WITH expired AS (
    SELECT id
    FROM public.report_execution_jobs
    WHERE company_id = p_company_id
      AND status IN ('leased', 'processing')
      AND lease_expires_at IS NOT NULL
      AND lease_expires_at <= clock_timestamp()
    ORDER BY lease_expires_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.report_execution_jobs AS job
  SET
    status = CASE
      WHEN job.attempt >= job.max_attempts THEN 'dead_letter'
      ELSE 'queued'
    END,
    lease_owner = NULL,
    lease_token = NULL,
    lease_expires_at = NULL,
    last_error = (
      CASE
        WHEN jsonb_typeof(job.last_error) = 'object' THEN job.last_error
        ELSE '{}'::jsonb
      END
    ) || jsonb_build_object(
      'code',
      CASE
        WHEN job.attempt >= job.max_attempts
          THEN 'worker_attempts_exhausted_after_lease_expiry'
        ELSE 'worker_lease_expired_retry'
      END,
      'previous_status', job.status,
      'attempt', job.attempt,
      'max_attempts', job.max_attempts,
      'recovered_at', clock_timestamp()
    ),
    completed_at = NULL,
    updated_at = clock_timestamp()
  FROM expired
  WHERE job.id = expired.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$function$;

REVOKE ALL ON FUNCTION public.recover_expired_report_execution_jobs(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_expired_report_execution_jobs(uuid, integer) TO service_role;
