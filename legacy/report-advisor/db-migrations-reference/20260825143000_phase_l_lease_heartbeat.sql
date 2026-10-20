-- Durable worker heartbeat: renew an active lease without permitting ownership transfer.
CREATE OR REPLACE FUNCTION public.heartbeat_report_execution_job(
  p_job_id uuid, p_worker_id text, p_lease_seconds integer DEFAULT 300
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
  IF p_lease_seconds < 30 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'lease seconds must be between 30 and 3600';
  END IF;

  UPDATE report_execution_jobs
  SET lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  WHERE id = p_job_id
    AND company_id = public.current_company_id()
    AND lease_owner = p_worker_id
    AND lease_expires_at > now()
    AND status IN ('leased','processing');

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END; $$;

GRANT EXECUTE ON FUNCTION public.heartbeat_report_execution_job(uuid,text,integer) TO authenticated;
