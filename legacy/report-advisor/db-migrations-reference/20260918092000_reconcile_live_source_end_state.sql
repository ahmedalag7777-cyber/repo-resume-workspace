-- Forward-only live/source end-state parity checkpoint.
-- This migration does not replay or rewrite historical migrations. It records and enforces
-- the current canonical Staging end-state already required by the repository contracts.
begin;

alter table public.import_jobs
  add column if not exists idempotency_key text,
  add column if not exists source_fingerprint text;

create unique index if not exists idx_import_jobs_id_company
  on public.import_jobs(id, company_id);

create unique index if not exists idx_import_job_rows_id_company
  on public.import_job_rows(id, company_id);

create index if not exists idx_import_job_rows_company_job
  on public.import_job_rows(company_id, job_id);

do $$
begin
  if exists (
    select 1
    from public.import_job_rows r
    left join public.import_jobs j on j.id = r.job_id
    where r.company_id is null
       or j.id is null
       or r.company_id is distinct from j.company_id
  ) then
    raise exception 'IMPORT_JOB_ROW_TENANT_PARITY_FAILED';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.import_job_rows'::regclass
      and conname = 'import_job_rows_job_company_fk'
  ) then
    alter table public.import_job_rows
      add constraint import_job_rows_job_company_fk
      foreign key (job_id, company_id)
      references public.import_jobs(id, company_id)
      on delete cascade;
  end if;
end
$$;

alter table public.import_field_lineage enable row level security;

drop policy if exists authenticated_import_field_lineage_deny
  on public.import_field_lineage;

create policy authenticated_import_field_lineage_deny
on public.import_field_lineage
as restrictive
for all
to authenticated
using (false)
with check (false);

revoke all on table public.import_field_lineage from anon, authenticated;

revoke execute on function public.advance_report_execution_checkpoint(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.claim_report_execution_job(uuid, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.complete_report_execution_job(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.enqueue_report_execution_job(uuid, text, text, text, text[], integer) from public, anon, authenticated;
revoke execute on function public.fail_report_execution_job(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.heartbeat_report_execution_job(uuid, uuid, text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.recover_expired_report_execution_jobs(uuid, integer) from public, anon, authenticated;
revoke execute on function public.retry_report_execution_job(uuid, uuid) from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from (
      values
        ('advance_report_execution_checkpoint(uuid,uuid,text,uuid,jsonb)'),
        ('claim_report_execution_job(uuid,uuid,text,integer)'),
        ('complete_report_execution_job(uuid,uuid,text,uuid,jsonb)'),
        ('enqueue_report_execution_job(uuid,text,text,text,text[],integer)'),
        ('fail_report_execution_job(uuid,uuid,text,uuid,jsonb)'),
        ('heartbeat_report_execution_job(uuid,uuid,text,uuid,integer)'),
        ('recover_expired_report_execution_jobs(uuid,integer)'),
        ('retry_report_execution_job(uuid,uuid)')
    ) as f(signature)
    where has_function_privilege('authenticated', f.signature, 'EXECUTE')
  ) then
    raise exception 'WORKER_AUTHENTICATED_EXECUTE_PARITY_FAILED';
  end if;
end
$$;

alter function public.advance_report_execution_checkpoint(uuid, uuid, text, uuid, jsonb)
  set search_path = public, pg_catalog;
alter function public.claim_report_execution_job(uuid, uuid, text, integer)
  set search_path = public, pg_catalog;
alter function public.complete_report_execution_job(uuid, uuid, text, uuid, jsonb)
  set search_path = public, pg_catalog;
alter function public.enqueue_report_execution_job(uuid, text, text, text, text[], integer)
  set search_path = public, pg_catalog;
alter function public.fail_report_execution_job(uuid, uuid, text, uuid, jsonb)
  set search_path = public, pg_catalog;
alter function public.heartbeat_report_execution_job(uuid, uuid, text, uuid, integer)
  set search_path = public, pg_catalog;
alter function public.recover_expired_report_execution_jobs(uuid, integer)
  set search_path = public, pg_catalog;
alter function public.retry_report_execution_job(uuid, uuid)
  set search_path = public, pg_catalog;

commit;
