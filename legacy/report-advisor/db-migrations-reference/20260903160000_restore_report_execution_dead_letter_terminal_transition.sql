-- Restore the durable worker terminal-state invariant lost when the later
-- report_execution_worker_lifecycle migration replaced the hardened failure
-- transition. Once the claimed attempt reaches max_attempts, the job must enter
-- dead_letter and remain non-retryable while preserving structured failure evidence.
CREATE OR REPLACE FUNCTION public.fail_report_execution_job(
  p_job_id uuid,
  p_worker_id text,
  p_error jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
declare affected integer;
begin
  IF p_error IS NULL OR jsonb_typeof(p_error) <> 'object' THEN
    RAISE EXCEPTION 'Failure transition requires a structured error payload';
  END IF;

  update public.report_execution_jobs
     set status = CASE WHEN attempt >= max_attempts THEN 'dead_letter' ELSE 'failed' END,
         last_error = p_error,
         lease_owner = null,
         lease_expires_at = null,
         completed_at = null,
         updated_at = now()
   where id = p_job_id
     and company_id = public.current_company_id()
     and status in ('leased', 'processing')
     and lease_owner = p_worker_id
     and lease_expires_at is not null
     and lease_expires_at > now();
  get diagnostics affected = row_count;
  return affected > 0;
end;
$function$;

revoke all on function public.fail_report_execution_job(uuid, text, jsonb) from public, anon;
grant execute on function public.fail_report_execution_job(uuid, text, jsonb) to service_role;
