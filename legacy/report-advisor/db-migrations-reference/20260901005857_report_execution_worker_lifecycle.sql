create or replace function public.heartbeat_report_execution_job(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.report_execution_jobs
     set lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 30)), updated_at = now()
   where id = p_job_id and company_id = public.current_company_id()
     and status in ('leased', 'processing') and lease_owner = p_worker_id
     and lease_expires_at is not null and lease_expires_at > now();
  get diagnostics affected = row_count; return affected > 0;
end;
$$;

create or replace function public.advance_report_execution_checkpoint(
  p_job_id uuid,
  p_worker_id text,
  p_checkpoint jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.report_execution_jobs
     set checkpoint = coalesce(p_checkpoint, '{}'::jsonb), status = 'processing', updated_at = now()
   where id = p_job_id and company_id = public.current_company_id()
     and status in ('leased', 'processing') and lease_owner = p_worker_id
     and lease_expires_at is not null and lease_expires_at > now();
  get diagnostics affected = row_count; return affected > 0;
end;
$$;

create or replace function public.complete_report_execution_job(
  p_job_id uuid,
  p_worker_id text,
  p_evidence jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.report_execution_jobs
     set status = 'completed', evidence = coalesce(p_evidence, '{}'::jsonb), lease_owner = null,
         lease_expires_at = null, completed_at = now(), updated_at = now()
   where id = p_job_id and company_id = public.current_company_id()
     and status in ('leased', 'processing') and lease_owner = p_worker_id
     and lease_expires_at is not null and lease_expires_at > now();
  get diagnostics affected = row_count; return affected > 0;
end;
$$;

create or replace function public.fail_report_execution_job(
  p_job_id uuid,
  p_worker_id text,
  p_error jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.report_execution_jobs
     set status = 'failed', last_error = coalesce(p_error, '{}'::jsonb), lease_owner = null,
         lease_expires_at = null, completed_at = null, updated_at = now()
   where id = p_job_id and company_id = public.current_company_id()
     and status in ('leased', 'processing') and lease_owner = p_worker_id
     and lease_expires_at is not null and lease_expires_at > now();
  get diagnostics affected = row_count; return affected > 0;
end;
$$;

create or replace function public.retry_report_execution_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.report_execution_jobs
     set status = 'queued', lease_owner = null, lease_expires_at = null,
         last_error = '{}'::jsonb, completed_at = null, updated_at = now()
   where id = p_job_id and company_id = public.current_company_id()
     and status = 'failed' and attempt < max_attempts;
  get diagnostics affected = row_count; return affected > 0;
end;
$$;

revoke all on function public.heartbeat_report_execution_job(uuid, text, integer) from public, anon;
revoke all on function public.advance_report_execution_checkpoint(uuid, text, jsonb) from public, anon;
revoke all on function public.complete_report_execution_job(uuid, text, jsonb) from public, anon;
revoke all on function public.fail_report_execution_job(uuid, text, jsonb) from public, anon;
revoke all on function public.retry_report_execution_job(uuid) from public, anon;

grant execute on function public.heartbeat_report_execution_job(uuid, text, integer) to service_role;
grant execute on function public.advance_report_execution_checkpoint(uuid, text, jsonb) to service_role;
grant execute on function public.complete_report_execution_job(uuid, text, jsonb) to service_role;
grant execute on function public.fail_report_execution_job(uuid, text, jsonb) to service_role;
grant execute on function public.retry_report_execution_job(uuid) to service_role;
