-- Progress updates may never resurrect a terminal import job.
-- The row lock serializes finish/progress races; the terminal-state guard
-- rejects stale/replayed worker progress after finalization.

create or replace function public.import_update_job_progress(
  p_job_id uuid,
  p_processed_rows integer,
  p_valid_rows integer,
  p_invalid_rows integer DEFAULT 0,
  p_duplicate_rows integer DEFAULT 0,
  p_status text DEFAULT 'processing'
)
returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_total integer;
  v_existing_processed integer;
  v_existing_valid integer;
  v_existing_invalid integer;
  v_existing_duplicate integer;
  v_current_status text;
  v_processed integer;
  v_valid integer;
  v_invalid integer;
  v_duplicate integer;
  v_status text := coalesce(nullif(trim(p_status), ''), 'processing');
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if v_status not in ('queued','processing') then raise exception 'IMPORT_NON_TERMINAL_STATUS_REQUIRED'; end if;

  select total_rows, processed_rows, valid_rows, invalid_rows, duplicate_rows, status
    into v_total, v_existing_processed, v_existing_valid, v_existing_invalid,
         v_existing_duplicate, v_current_status
    from public.import_jobs
   where id = p_job_id
     and company_id = v_company_id
   for update;

  if not found then raise exception 'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN'; end if;
  if v_current_status in ('completed','partial','failed','cancelled') then
    raise exception 'IMPORT_JOB_ALREADY_TERMINAL';
  end if;
  if v_current_status not in ('queued','processing') then
    raise exception 'IMPORT_JOB_STATE_INVALID';
  end if;

  v_processed := greatest(coalesce(v_existing_processed, 0), least(greatest(coalesce(p_processed_rows, 0), 0), greatest(coalesce(v_total, 0), 0)));
  v_valid := greatest(coalesce(v_existing_valid, 0), least(greatest(coalesce(p_valid_rows, 0), 0), v_processed));
  v_invalid := greatest(coalesce(v_existing_invalid, 0), least(greatest(coalesce(p_invalid_rows, 0), 0), v_processed));
  v_duplicate := greatest(coalesce(v_existing_duplicate, 0), least(greatest(coalesce(p_duplicate_rows, 0), 0), v_processed));

  update public.import_jobs
     set status = v_status,
         processed_rows = v_processed,
         valid_rows = v_valid,
         invalid_rows = v_invalid,
         duplicate_rows = v_duplicate,
         progress = case when coalesce(v_total, 0) > 0 then least(100, greatest(0, round(v_processed::numeric / v_total::numeric * 100)::integer)) else 0 end,
         started_at = coalesce(started_at, now())
   where id = p_job_id
     and company_id = v_company_id
     and status in ('queued','processing');

  if not found then raise exception 'IMPORT_JOB_STATE_CHANGED'; end if;
end;
$$;
