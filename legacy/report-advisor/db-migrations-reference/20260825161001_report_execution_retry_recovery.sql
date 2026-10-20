-- Durable report execution recovery: failed jobs may be explicitly re-queued only
-- while their retry budget remains. Tenant and state ownership are enforced in DB.
CREATE OR REPLACE FUNCTION public.retry_report_execution_job(
  p_job_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE report_execution_jobs
  SET status = 'queued',
      lease_owner = NULL,
      lease_expires_at = NULL,
      updated_at = now()
  WHERE id = p_job_id
    AND company_id = public.current_company_id()
    AND status = 'failed'
    AND attempt < max_attempts;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.retry_report_execution_job(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.retry_report_execution_job(uuid) TO authenticated;
