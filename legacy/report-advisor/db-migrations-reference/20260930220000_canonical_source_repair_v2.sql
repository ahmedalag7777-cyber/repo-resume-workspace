create table if not exists public.canonical_import_repair_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  entity_type text not null,
  source_hash text not null,
  previous_import_job_id uuid,
  previous_committed_count integer not null,
  previous_committed_ids jsonb not null default '[]'::jsonb,
  reason text not null,
  parser_version text not null,
  created_at timestamptz not null default clock_timestamp()
);

alter table public.canonical_import_repair_history enable row level security;
revoke all on table public.canonical_import_repair_history from public, anon, authenticated;
grant all on table public.canonical_import_repair_history to service_role;

create or replace function public.enqueue_report_execution_job(
  p_company_id uuid,
  p_job_key text,
  p_source_path text,
  p_source_hash text,
  p_evidence_keys text[] default '{}',
  p_max_attempts integer default 5,
  p_force_reprocess boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  existing public.report_execution_jobs%rowtype;
  inserted public.report_execution_jobs%rowtype;
  target_job public.report_execution_jobs%rowtype;
  initial_checkpoint jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_company_id is null then raise exception 'company_id is required'; end if;
  if p_job_key is null or btrim(p_job_key) = '' then raise exception 'job_key is required'; end if;
  if p_source_path is null or btrim(p_source_path) = '' then raise exception 'source_path is required'; end if;
  if p_source_hash is null or btrim(p_source_hash) = '' then raise exception 'source_hash is required'; end if;
  if p_max_attempts is null or p_max_attempts < 1 or p_max_attempts > 100 then raise exception 'max_attempts must be between 1 and 100'; end if;
  if p_force_reprocess and auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED_FOR_FORCE_REPROCESS'; end if;

  initial_checkpoint := jsonb_build_object(
    'stage','queued',
    'sourceHash',p_source_hash,
    'evidenceKeys',coalesce(p_evidence_keys,'{}'),
    'updatedAt',floor(extract(epoch from clock_timestamp()) * 1000)::bigint
  );

  insert into public.report_execution_jobs(
    company_id,job_key,source_path,source_hash,status,checkpoint,max_attempts
  )
  values(
    p_company_id,btrim(p_job_key),btrim(p_source_path),btrim(p_source_hash),'queued',initial_checkpoint,p_max_attempts
  )
  on conflict(company_id,job_key) do nothing
  returning * into inserted;

  if inserted.id is null then
    select * into existing
    from public.report_execution_jobs
    where company_id=p_company_id and job_key=btrim(p_job_key)
    for update;

    if not found then
      raise exception 'Durable job conflict was not found; refusing ambiguous enqueue result';
    end if;

    if existing.source_path is null or existing.source_hash is null then
      raise exception 'Existing durable job is missing source identity; refusing provenance-unsafe enqueue';
    end if;

    if existing.source_hash <> btrim(p_source_hash) or existing.source_path <> btrim(p_source_path) then
      raise exception 'Durable job key already exists with different source identity';
    end if;

    if existing.status = 'dead_letter' then
      perform public.recover_dead_letter_report_execution_job(existing.id, p_company_id);
      select * into existing
      from public.report_execution_jobs
      where id=existing.id and company_id=p_company_id
      for update;
    elsif p_force_reprocess and existing.status in ('completed','succeeded','failed','cancelled') then
      update public.report_execution_jobs
      set status='queued',
          checkpoint=initial_checkpoint,
          evidence='{}'::jsonb,
          last_error=null,
          completed_at=null,
          lease_owner=null,
          lease_token=null,
          lease_expires_at=null,
          attempt=coalesce(attempt,0)+1,
          max_attempts=p_max_attempts,
          updated_at=clock_timestamp()
      where id=existing.id and company_id=p_company_id
      returning * into existing;

      delete from public.report_execution_tasks
      where company_id=p_company_id and report_execution_job_id=existing.id;

    end if;

    target_job := existing;
  else
    target_job := inserted;
  end if;

  insert into public.report_execution_tasks(
    company_id, report_execution_job_id, task_key, stage, ordinal, label
  )
  values
    (target_job.company_id, target_job.id, '01-queued', 'queued', 1, 'استلام العملية'),
    (target_job.company_id, target_job.id, '02-fingerprinted', 'fingerprinted', 2, 'إثبات بصمة المصدر'),
    (target_job.company_id, target_job.id, '03-extracted', 'extracted', 3, 'استخراج المحتوى'),
    (target_job.company_id, target_job.id, '04-canonicalized', 'canonicalized', 4, 'التوحيد والمطابقة'),
    (target_job.company_id, target_job.id, '05-validated', 'validated', 5, 'التحقق والجودة'),
    (target_job.company_id, target_job.id, '06-analyzed', 'analyzed', 6, 'التحليل وفهم الأعمال'),
    (target_job.company_id, target_job.id, '07-decisioned', 'decisioned', 7, 'بناء إشارة القرار'),
    (target_job.company_id, target_job.id, '08-committed', 'committed', 8, 'تثبيت الحقيقة الكانونية'),
    (target_job.company_id, target_job.id, '09-rendered', 'rendered', 9, 'إخراج التقرير ونتائج التشغيل')
  on conflict(company_id, report_execution_job_id, task_key) do nothing;

  return jsonb_build_object(
    'id',target_job.id,
    'company_id',target_job.company_id,
    'job_key',target_job.job_key,
    'source_path',target_job.source_path,
    'source_hash',target_job.source_hash,
    'status',target_job.status,
    'checkpoint',target_job.checkpoint,
    'attempt',target_job.attempt,
    'max_attempts',target_job.max_attempts,
    'lease_owner',target_job.lease_owner,
    'lease_token',target_job.lease_token,
    'forceReprocessed',p_force_reprocess
  );
end;
$function$;

create or replace function public.import_commit_batch(
  p_company_id uuid,
  p_entity_type text,
  p_rows jsonb,
  p_null_policy text default 'preserve',
  p_source_hash text default null,
  p_import_job_id uuid default null,
  p_repair boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
set statement_timeout to '30s'
as $function$
declare
  v_company_id uuid := public.current_company_id();
  v_existing public.canonical_import_commits%rowtype;
  v_file_record_id uuid;
  v_file_hash text;
  v_file_status text;
  v_file_security_status text;
  v_file_metadata jsonb;
  v_source_fingerprint text;
  v_job_type text;
  v_id uuid;
  v_count integer := 0;
  v_ids jsonb := '[]'::jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  if p_source_hash is null or btrim(p_source_hash) = '' then raise exception 'IMPORT_SOURCE_HASH_REQUIRED'; end if;
  if p_source_hash !~ '^sha256:[0-9a-fA-F]{64}$' then raise exception 'IMPORT_SOURCE_HASH_INVALID'; end if;
  if p_entity_type !~ '^generic:[a-z][a-z0-9_-]{0,63}$' then raise exception 'IMPORT_ENTITY_TYPE_UNSUPPORTED'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'IMPORT_ROWS_MUST_BE_ARRAY'; end if;
  if p_repair and auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED_FOR_CANONICAL_REPAIR'; end if;
  if p_repair and p_import_job_id is null then raise exception 'IMPORT_JOB_ID_REQUIRED_FOR_CANONICAL_REPAIR'; end if;

  select i.file_record_id, fr.file_hash, fr.status, fr.security_status, fr.metadata, i.source_fingerprint, i.job_type
  into v_file_record_id, v_file_hash, v_file_status, v_file_security_status, v_file_metadata, v_source_fingerprint, v_job_type
  from public.import_jobs i
  join public.file_records fr on fr.id = i.file_record_id and fr.company_id = i.company_id
  where i.id = p_import_job_id and i.company_id = v_company_id
  for share of i;

  if not found or v_file_record_id is null then raise exception 'IMPORT_JOB_SOURCE_RECORD_NOT_FOUND_OR_FORBIDDEN'; end if;
  if v_file_hash is null or v_file_hash !~ '^sha256:[0-9a-fA-F]{64}$' then raise exception 'AUTHORITATIVE_SOURCE_HASH_INVALID'; end if;
  if v_file_hash is distinct from p_source_hash then raise exception 'AUTHORITATIVE_SOURCE_HASH_MISMATCH'; end if;
  if v_file_status is distinct from 'ready' or v_file_security_status is distinct from 'passed' then raise exception 'AUTHORITATIVE_SOURCE_NOT_VERIFIED'; end if;
  if coalesce(v_file_metadata->>'raw_bytes_sha256','') is distinct from v_file_hash then raise exception 'AUTHORITATIVE_SOURCE_RAW_HASH_PROOF_MISSING'; end if;
  if v_source_fingerprint is null or btrim(v_source_fingerprint) = '' then raise exception 'IMPORT_SOURCE_FINGERPRINT_REQUIRED'; end if;
  if v_source_fingerprint is distinct from v_file_hash then raise exception 'AUTHORITATIVE_SOURCE_HASH_DRIFT'; end if;
  if v_job_type is not null and v_job_type is distinct from p_entity_type then raise exception 'IMPORT_JOB_ENTITY_TYPE_MISMATCH'; end if;

  perform pg_advisory_xact_lock(hashtextextended(coalesce(v_company_id::text,'') || ':' || p_entity_type || ':' || p_source_hash, 0));

  select * into v_existing
  from public.canonical_import_commits c
  where c.company_id=v_company_id and c.entity_type=p_entity_type and c.source_hash=p_source_hash
  for update;

  if found then
    if not p_repair then
      if v_existing.committed_count <> jsonb_array_length(p_rows) then
        raise exception 'CANONICAL_EXISTING_COMMIT_COUNT_MISMATCH';
      end if;
      return jsonb_build_object('committed',v_existing.committed_count,'ids',v_existing.committed_ids,'idempotent_replay',true,'import_job_id',p_import_job_id);
    end if;

    insert into public.canonical_import_repair_history(
      company_id,entity_type,source_hash,previous_import_job_id,previous_committed_count,previous_committed_ids,reason,parser_version
    )
    values(
      v_company_id,p_entity_type,p_source_hash,p_import_job_id,v_existing.committed_count,v_existing.committed_ids,
      'SOURCE_PARSER_REPAIR','2026-09-30-arabic-sales-layout-v2'
    );

    delete from public.canonical_dataset_records
    where company_id=v_company_id and source_hash=p_source_hash;

    delete from public.canonical_import_commits
    where company_id=v_company_id and entity_type=p_entity_type and source_hash=p_source_hash;
  end if;

  if p_entity_type !~ '^generic:' then raise exception 'CANONICAL_REPAIR_GENERIC_ONLY'; end if;
  if jsonb_array_length(p_rows)=0 then raise exception 'IMPORT_ROWS_MUST_NOT_BE_EMPTY'; end if;

  insert into public.canonical_import_commits(company_id,entity_type,source_hash,committed_ids,committed_count)
  values(v_company_id,p_entity_type,p_source_hash,'[]'::jsonb,0);

  if jsonb_array_length(p_rows) > 0 then
    with inserted as (
      insert into public.canonical_dataset_records(
        company_id,import_job_id,source_hash,semantic_domain,row_number,record_key,data,provenance
      )
      select
        v_company_id,
        p_import_job_id,
        p_source_hash,
        substr(p_entity_type,9),
        (value->>'row_number')::integer,
        value->>'record_key',
        value->'data',
        value->'provenance'
      from jsonb_array_elements(p_rows) as x(value)
      order by (value->>'row_number')::integer
      returning id,row_number
    )
    select count(*)::integer, coalesce(jsonb_agg(id order by row_number),'[]'::jsonb)
    into v_count,v_ids
    from inserted;
  end if;

  if v_count <> jsonb_array_length(p_rows) then raise exception 'GENERIC_CANONICAL_COMMIT_COUNT_MISMATCH'; end if;

  update public.canonical_import_commits
  set committed_ids=v_ids, committed_count=v_count, committed_at=clock_timestamp()
  where company_id=v_company_id and entity_type=p_entity_type and source_hash=p_source_hash;

  return jsonb_build_object('committed',v_count,'ids',v_ids,'idempotent_replay',false,'import_job_id',p_import_job_id,'repair',p_repair);
end;
$function$;

revoke all on function public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean) to service_role;


revoke all on function public.enqueue_report_execution_job(uuid,text,text,text,text[],integer,boolean) from public, anon, authenticated;
grant execute on function public.enqueue_report_execution_job(uuid,text,text,text,text[],integer,boolean) to service_role;