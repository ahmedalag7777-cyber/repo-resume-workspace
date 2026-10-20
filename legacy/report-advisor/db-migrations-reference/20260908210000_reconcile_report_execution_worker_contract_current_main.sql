-- Forward-only reconciliation of the verified Staging durable worker contract.
-- Fresh environments must replay the tenant-bound, lease-token-fenced worker contract
-- that is already live in Staging. Historical migrations are intentionally untouched.

create table if not exists public.report_execution_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_key text not null,
  source_path text not null,
  source_hash text not null,
  status text not null default 'queued',
  checkpoint jsonb not null default '{}'::jsonb,
  attempt integer not null default 0,
  max_attempts integer not null default 5,
  lease_owner text,
  lease_expires_at timestamptz,
  last_error jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  lease_token uuid,
  unique (company_id, job_key)
);

alter table public.report_execution_jobs add column if not exists company_id uuid;
alter table public.report_execution_jobs add column if not exists job_key text;
alter table public.report_execution_jobs add column if not exists source_path text;
alter table public.report_execution_jobs add column if not exists source_hash text;
alter table public.report_execution_jobs add column if not exists status text not null default 'queued';
alter table public.report_execution_jobs add column if not exists checkpoint jsonb not null default '{}'::jsonb;
alter table public.report_execution_jobs add column if not exists attempt integer not null default 0;
alter table public.report_execution_jobs add column if not exists max_attempts integer not null default 5;
alter table public.report_execution_jobs add column if not exists lease_owner text;
alter table public.report_execution_jobs add column if not exists lease_expires_at timestamptz;
alter table public.report_execution_jobs add column if not exists last_error jsonb not null default '{}'::jsonb;
alter table public.report_execution_jobs add column if not exists evidence jsonb not null default '{}'::jsonb;
alter table public.report_execution_jobs add column if not exists created_at timestamptz not null default now();
alter table public.report_execution_jobs add column if not exists updated_at timestamptz not null default now();
alter table public.report_execution_jobs add column if not exists completed_at timestamptz;
alter table public.report_execution_jobs add column if not exists lease_token uuid;

create unique index if not exists idx_report_execution_jobs_company_job_key
  on public.report_execution_jobs(company_id, job_key);
create index if not exists idx_report_execution_jobs_queue
  on public.report_execution_jobs(status, created_at);
create index if not exists idx_report_execution_jobs_company
  on public.report_execution_jobs(company_id, created_at desc);
create index if not exists idx_report_execution_jobs_lease
  on public.report_execution_jobs(status, lease_expires_at);
create index if not exists idx_report_execution_jobs_ready
  on public.report_execution_jobs(company_id, status, created_at);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.report_execution_jobs WHERE source_path IS NULL OR source_hash IS NULL) THEN
    RAISE EXCEPTION 'report_execution_jobs contains rows without source identity; refusing worker-contract reconciliation';
  END IF;
  UPDATE public.report_execution_jobs SET max_attempts = 5 WHERE max_attempts IS NULL;
END
$$;

alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_status_check;
alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_status_values;
alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_lease_token_integrity;
alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_attempt_bounds;
alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_attempt_check;
alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_max_attempts_check;
alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_source_path_not_null_check;
alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_source_hash_not_null_check;
alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_max_attempts_not_null_check;

alter table public.report_execution_jobs
  add constraint report_execution_jobs_status_check
  check (status in ('queued','leased','processing','completed','failed','dead_letter'));
alter table public.report_execution_jobs
  add constraint report_execution_jobs_attempt_bounds
  check (attempt >= 0 and max_attempts >= 1 and attempt <= max_attempts);
alter table public.report_execution_jobs
  add constraint report_execution_jobs_lease_token_integrity
  check ((status in ('leased','processing') and lease_token is not null and lease_owner is not null and lease_expires_at is not null) or status not in ('leased','processing'));

alter table public.report_execution_jobs alter column source_path set not null;
alter table public.report_execution_jobs alter column source_hash set not null;
alter table public.report_execution_jobs alter column max_attempts set default 5;
alter table public.report_execution_jobs alter column max_attempts set not null;

alter table public.report_execution_jobs drop constraint if exists report_execution_jobs_company_id_fkey;
alter table public.report_execution_jobs
  add constraint report_execution_jobs_company_id_fkey
  foreign key (company_id) references public.companies(id) on delete cascade;

alter table public.report_execution_jobs enable row level security;
drop policy if exists report_execution_jobs_tenant on public.report_execution_jobs;
create policy report_execution_jobs_tenant on public.report_execution_jobs
  for all to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create or replace function public.enqueue_report_execution_job(
  p_company_id uuid, p_job_key text, p_source_path text, p_source_hash text,
  p_evidence_keys text[] default '{}', p_max_attempts integer default 5
)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare existing public.report_execution_jobs%rowtype; inserted public.report_execution_jobs%rowtype; initial_checkpoint jsonb;
begin
  if p_company_id is null then raise exception 'company_id is required'; end if;
  if p_job_key is null or btrim(p_job_key) = '' then raise exception 'job_key is required'; end if;
  if p_source_path is null or btrim(p_source_path) = '' then raise exception 'source_path is required'; end if;
  if p_source_hash is null or btrim(p_source_hash) = '' then raise exception 'source_hash is required'; end if;
  if p_max_attempts is null or p_max_attempts < 1 or p_max_attempts > 100 then raise exception 'max_attempts must be between 1 and 100'; end if;
  initial_checkpoint := jsonb_build_object('stage','queued','sourceHash',p_source_hash,'evidenceKeys',coalesce(p_evidence_keys,'{}'),'updatedAt',floor(extract(epoch from clock_timestamp()) * 1000)::bigint);
  insert into public.report_execution_jobs(company_id,job_key,source_path,source_hash,status,checkpoint,max_attempts)
    values(p_company_id,btrim(p_job_key),btrim(p_source_path),btrim(p_source_hash),'queued',initial_checkpoint,p_max_attempts)
    on conflict(company_id,job_key) do nothing returning * into inserted;
  if inserted.id is null then
    select * into existing from public.report_execution_jobs where company_id=p_company_id and job_key=btrim(p_job_key) for update;
    if not found then raise exception 'Durable job conflict was not found; refusing ambiguous enqueue result'; end if;
    if existing.source_path is null or existing.source_hash is null then raise exception 'Existing durable job is missing source identity; refusing provenance-unsafe enqueue'; end if;
    if existing.source_hash <> btrim(p_source_hash) or existing.source_path <> btrim(p_source_path) then raise exception 'Durable job key already exists with different source identity'; end if;
    return jsonb_build_object('id',existing.id,'company_id',existing.company_id,'job_key',existing.job_key,'source_path',existing.source_path,'source_hash',existing.source_hash,'status',existing.status,'checkpoint',existing.checkpoint,'attempt',existing.attempt,'max_attempts',existing.max_attempts,'lease_owner',existing.lease_owner,'lease_token',existing.lease_token,'lease_expires_at',existing.lease_expires_at);
  end if;
  return jsonb_build_object('id',inserted.id,'company_id',inserted.company_id,'job_key',inserted.job_key,'source_path',inserted.source_path,'source_hash',inserted.source_hash,'status',inserted.status,'checkpoint',inserted.checkpoint,'attempt',inserted.attempt,'max_attempts',inserted.max_attempts,'lease_owner',inserted.lease_owner,'lease_token',inserted.lease_token,'lease_expires_at',inserted.lease_expires_at);
end;$function$;

create or replace function public.claim_report_execution_job(p_job_id uuid,p_company_id uuid,p_lease_owner text,p_lease_seconds integer default 300)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare claimed_row jsonb;
begin
  if p_company_id is null then raise exception 'Worker company context is required'; end if;
  if p_lease_owner is null or btrim(p_lease_owner)='' then raise exception 'Worker lease owner is required'; end if;
  if p_lease_seconds is null or p_lease_seconds<30 then raise exception 'Worker lease must be at least 30 seconds'; end if;
  update public.report_execution_jobs set status='dead_letter',lease_owner=null,lease_token=null,lease_expires_at=null,last_error=jsonb_build_object('code','lease_expired_max_attempts','message','Lease expired after the maximum attempt budget was exhausted','at',now()),updated_at=now()
    where id=p_job_id and company_id=p_company_id and status in ('leased','processing') and lease_expires_at is not null and lease_expires_at<=now() and attempt>=max_attempts;
  update public.report_execution_jobs set status='leased',lease_owner=p_lease_owner,lease_token=gen_random_uuid(),lease_expires_at=now()+make_interval(secs=>p_lease_seconds),attempt=attempt+1,updated_at=now()
    where id=p_job_id and company_id=p_company_id and status in ('queued','leased','processing') and (lease_expires_at is null or lease_expires_at<=now()) and attempt<max_attempts
    returning jsonb_build_object('id',id,'company_id',company_id,'job_key',job_key,'source_path',source_path,'source_hash',source_hash,'status',status,'checkpoint',checkpoint,'attempt',attempt,'max_attempts',max_attempts,'lease_owner',lease_owner,'lease_token',lease_token,'lease_expires_at',lease_expires_at) into claimed_row;
  return claimed_row;
end;$function$;

create or replace function public.heartbeat_report_execution_job(p_job_id uuid,p_company_id uuid,p_worker_id text,p_lease_token uuid,p_lease_seconds integer default 300)
returns boolean language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare affected integer;
begin
  if p_company_id is null then raise exception 'Worker company context is required'; end if;
  if p_lease_seconds is null or p_lease_seconds<30 then raise exception 'Worker lease must be at least 30 seconds'; end if;
  update public.report_execution_jobs set lease_expires_at=now()+make_interval(secs=>p_lease_seconds),updated_at=now()
   where id=p_job_id and company_id=p_company_id and status in ('leased','processing') and lease_owner=p_worker_id and lease_token=p_lease_token and lease_expires_at is not null and lease_expires_at>now();
  get diagnostics affected=row_count; return affected=1;
end;$function$;

create or replace function public.advance_report_execution_checkpoint(p_job_id uuid,p_company_id uuid,p_worker_id text,p_lease_token uuid,p_checkpoint jsonb)
returns boolean language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare affected integer; old_stage text; new_stage text; old_hash text; new_hash text; old_pos integer; new_pos integer;
begin
  if p_company_id is null then raise exception 'Worker company context is required'; end if;
  if p_checkpoint is null or jsonb_typeof(p_checkpoint)<>'object' then raise exception 'Checkpoint must be a JSON object'; end if;
  new_stage=p_checkpoint->>'stage'; new_hash=p_checkpoint->>'sourceHash';
  if new_stage is null or new_stage not in ('queued','fingerprinted','extracted','canonicalized','validated','analyzed','decisioned','committed','rendered') then raise exception 'Checkpoint stage is invalid'; end if;
  if new_hash is null or btrim(new_hash)='' then raise exception 'Checkpoint source hash is required'; end if;
  if jsonb_typeof(p_checkpoint->'evidenceKeys') is distinct from 'array' then raise exception 'Checkpoint evidenceKeys must be an array'; end if;
  select checkpoint->>'stage',checkpoint->>'sourceHash' into old_stage,old_hash from public.report_execution_jobs where id=p_job_id and company_id=p_company_id and status in ('leased','processing') and lease_owner=p_worker_id and lease_token=p_lease_token and lease_expires_at is not null and lease_expires_at>now() for update;
  if not found then return false; end if;
  if old_hash is not null and btrim(old_hash)<>'' and old_hash<>new_hash then raise exception 'Checkpoint source hash cannot change during a run'; end if;
  if old_stage is null then
    if new_stage<>'queued' then raise exception 'Initial checkpoint stage must be queued'; end if;
  else
    old_pos=array_position(array['queued','fingerprinted','extracted','canonicalized','validated','analyzed','decisioned','committed','rendered'],old_stage);
    new_pos=array_position(array['queued','fingerprinted','extracted','canonicalized','validated','analyzed','decisioned','committed','rendered'],new_stage);
    if old_pos is null or new_pos<>old_pos+1 then raise exception 'Invalid checkpoint transition: % -> %',old_stage,new_stage; end if;
  end if;
  update public.report_execution_jobs set checkpoint=p_checkpoint,status='processing',updated_at=now() where id=p_job_id and company_id=p_company_id and status in ('leased','processing') and lease_owner=p_worker_id and lease_token=p_lease_token and lease_expires_at is not null and lease_expires_at>now();
  get diagnostics affected=row_count; return affected=1;
end;$function$;

create or replace function public.complete_report_execution_job(p_job_id uuid,p_company_id uuid,p_worker_id text,p_lease_token uuid,p_evidence jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare affected integer;
begin
  if p_company_id is null then raise exception 'Worker company context is required'; end if;
  if p_evidence is null or jsonb_typeof(p_evidence)<>'object' then raise exception 'Completion evidence must be a JSON object'; end if;
  update public.report_execution_jobs set status='completed',evidence=p_evidence,lease_owner=null,lease_token=null,lease_expires_at=null,completed_at=now(),updated_at=now() where id=p_job_id and company_id=p_company_id and status in ('leased','processing') and lease_owner=p_worker_id and lease_token=p_lease_token and lease_expires_at is not null and lease_expires_at>now() and checkpoint->>'stage'='rendered';
  get diagnostics affected=row_count; return affected=1;
end;$function$;

create or replace function public.fail_report_execution_job(p_job_id uuid,p_company_id uuid,p_worker_id text,p_lease_token uuid,p_error jsonb)
returns boolean language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare affected integer;
begin
  if p_company_id is null then raise exception 'Worker company context is required'; end if;
  if p_error is null or jsonb_typeof(p_error)<>'object' then raise exception 'Failure transition requires a structured error payload'; end if;
  update public.report_execution_jobs set status=case when attempt>=max_attempts then 'dead_letter' else 'failed' end,last_error=p_error,lease_owner=null,lease_token=null,lease_expires_at=null,completed_at=null,updated_at=now() where id=p_job_id and company_id=p_company_id and status in ('leased','processing') and lease_owner=p_worker_id and lease_token=p_lease_token and lease_expires_at is not null and lease_expires_at>now();
  get diagnostics affected=row_count; return affected=1;
end;$function$;

create or replace function public.recover_expired_report_execution_jobs(p_company_id uuid,p_limit integer default 100)
returns integer language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare affected integer;
begin
  if p_company_id is null then raise exception 'Worker company context is required'; end if;
  if p_limit is null or p_limit<1 or p_limit>1000 then raise exception 'Recovery limit must be between 1 and 1000'; end if;
  update public.report_execution_jobs set status='dead_letter',lease_owner=null,lease_token=null,lease_expires_at=null,last_error=case when jsonb_typeof(last_error)='object' then last_error || jsonb_build_object('code','worker_attempts_exhausted_after_lease_expiry','recovered_at',now()) else jsonb_build_object('code','worker_attempts_exhausted_after_lease_expiry','recovered_at',now()) end,updated_at=now()
   where id in (select id from public.report_execution_jobs where company_id=p_company_id and status in ('leased','processing') and lease_expires_at is not null and lease_expires_at<=now() and attempt>=max_attempts order by lease_expires_at,created_at for update skip locked limit p_limit);
  get diagnostics affected=row_count; return affected;
end;$function$;

create or replace function public.retry_report_execution_job(p_job_id uuid,p_company_id uuid)
returns boolean language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare affected integer;
begin
  if p_company_id is null then raise exception 'Worker company context is required'; end if;
  update public.report_execution_jobs set status='queued',lease_owner=null,lease_token=null,lease_expires_at=null,last_error='{}'::jsonb,completed_at=null,updated_at=now() where id=p_job_id and company_id=p_company_id and status='failed' and attempt<max_attempts;
  get diagnostics affected=row_count; return affected=1;
end;$function$;

-- Remove legacy application-callable worker signatures.
drop function if exists public.claim_report_execution_job(uuid,text,integer);
drop function if exists public.heartbeat_report_execution_job(uuid,text,integer);
drop function if exists public.heartbeat_report_execution_job(uuid,text,uuid,integer);
drop function if exists public.advance_report_execution_checkpoint(uuid,text,uuid,jsonb);
drop function if exists public.complete_report_execution_job(uuid,text,uuid,jsonb);
drop function if exists public.fail_report_execution_job(uuid,text,uuid,jsonb);
drop function if exists public.retry_report_execution_job(uuid);

revoke all on function public.enqueue_report_execution_job(uuid,text,text,text,text[],integer) from public,anon,authenticated;
revoke all on function public.claim_report_execution_job(uuid,uuid,text,integer) from public,anon,authenticated;
revoke all on function public.heartbeat_report_execution_job(uuid,uuid,text,uuid,integer) from public,anon,authenticated;
revoke all on function public.advance_report_execution_checkpoint(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.complete_report_execution_job(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.fail_report_execution_job(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.recover_expired_report_execution_jobs(uuid,integer) from public,anon,authenticated;
revoke all on function public.retry_report_execution_job(uuid,uuid) from public,anon,authenticated;

grant execute on function public.enqueue_report_execution_job(uuid,text,text,text,text[],integer) to service_role;
grant execute on function public.claim_report_execution_job(uuid,uuid,text,integer) to service_role;
grant execute on function public.heartbeat_report_execution_job(uuid,uuid,text,uuid,integer) to service_role;
grant execute on function public.advance_report_execution_checkpoint(uuid,uuid,text,uuid,jsonb) to service_role;
grant execute on function public.complete_report_execution_job(uuid,uuid,text,uuid,jsonb) to service_role;
grant execute on function public.fail_report_execution_job(uuid,uuid,text,uuid,jsonb) to service_role;
grant execute on function public.recover_expired_report_execution_jobs(uuid,integer) to service_role;
grant execute on function public.retry_report_execution_job(uuid,uuid) to service_role;
