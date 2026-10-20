-- Harden SECURITY DEFINER durable-job enqueue boundaries.
-- Authenticated callers may enqueue only for their current tenant.
-- Service-role workers retain cross-tenant orchestration capability.

CREATE OR REPLACE FUNCTION public.enqueue_report_execution_job(
  p_company_id uuid,
  p_job_key text,
  p_source_path text,
  p_source_hash text,
  p_evidence_keys text[] DEFAULT '{}'::text[],
  p_max_attempts integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
declare
  existing public.report_execution_jobs%rowtype;
  inserted public.report_execution_jobs%rowtype;
  target_job public.report_execution_jobs%rowtype;
  initial_checkpoint jsonb;
  v_is_service_role boolean := coalesce(auth.jwt()->>'role','') = 'service_role';
  v_company_id uuid;
begin
  if p_company_id is null then raise exception 'company_id is required'; end if;
  if not v_is_service_role then
    if auth.uid() is null then raise exception 'AUTHENTICATED_USER_REQUIRED'; end if;
    v_company_id := public.current_company_id();
    if v_company_id is null or p_company_id is distinct from v_company_id then
      raise exception 'TENANT_CONTEXT_MISMATCH';
    end if;
  end if;
  if p_job_key is null or btrim(p_job_key) = '' then raise exception 'job_key is required'; end if;
  if p_source_path is null or btrim(p_source_path) = '' then raise exception 'source_path is required'; end if;
  if p_source_hash is null or btrim(p_source_hash) = '' then raise exception 'source_hash is required'; end if;
  if p_max_attempts is null or p_max_attempts < 1 or p_max_attempts > 100 then raise exception 'max_attempts must be between 1 and 100'; end if;

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
    'lease_expires_at',target_job.lease_expires_at
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_report_execution_job(
  p_company_id uuid,
  p_job_key text,
  p_source_path text,
  p_source_hash text,
  p_evidence_keys text[] DEFAULT '{}'::text[],
  p_max_attempts integer DEFAULT 5,
  p_force_reprocess boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
declare
  existing public.report_execution_jobs%rowtype;
  inserted public.report_execution_jobs%rowtype;
  target_job public.report_execution_jobs%rowtype;
  initial_checkpoint jsonb;
  v_is_service_role boolean := coalesce(auth.jwt()->>'role','') = 'service_role';
  v_company_id uuid;
begin
  if p_company_id is null then raise exception 'company_id is required'; end if;
  if not v_is_service_role then
    if auth.uid() is null then raise exception 'AUTHENTICATED_USER_REQUIRED'; end if;
    v_company_id := public.current_company_id();
    if v_company_id is null or p_company_id is distinct from v_company_id then
      raise exception 'TENANT_CONTEXT_MISMATCH';
    end if;
  end if;
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
