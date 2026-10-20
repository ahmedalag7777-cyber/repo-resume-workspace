-- Reconcile completed report recovery to the verified source file record.
--
-- This migration captures the canonical recovery fix already verified on staging:
-- a completed durable report may only finalize against a ready/passed file_records
-- row carrying the exact source hash, preserving the authoritative storage path
-- and file_record_id without rewriting canonical dataset rows.

create or replace function public.recover_completed_report_execution_result(
  p_company_id uuid,
  p_import_job_id uuid,
  p_report_execution_job_id uuid,
  p_entity_type text,
  p_source_hash text,
  p_row_count integer,
  p_rendered_output jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
set statement_timeout to '30s'
as $function$
declare
  v_job public.report_execution_jobs%rowtype;
  v_import public.import_jobs%rowtype;
  v_commit public.canonical_import_commits%rowtype;
  v_current_source public.file_records%rowtype;
  v_source_record public.file_records%rowtype;
  v_source_file_name text;
  v_source_storage_bucket text;
  v_source_storage_path text;
  v_canonical_count integer;
  v_result_summary jsonb;
  v_evidence jsonb;
begin
  if p_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_import_job_id is null or p_report_execution_job_id is null then raise exception 'RECOVERY_JOB_ID_REQUIRED'; end if;
  if p_source_hash !~ '^sha256:[0-9a-fA-F]{64}$' then raise exception 'RECOVERY_SOURCE_HASH_INVALID'; end if;
  if p_row_count < 1 then raise exception 'RECOVERY_ROW_COUNT_INVALID'; end if;
  if jsonb_typeof(p_rendered_output) is distinct from 'object' then raise exception 'RECOVERY_RENDERED_OUTPUT_INVALID'; end if;

  select * into v_job
  from public.report_execution_jobs
  where id = p_report_execution_job_id and company_id = p_company_id
  for update;
  if not found then raise exception 'RECOVERY_REPORT_EXECUTION_JOB_NOT_FOUND'; end if;
  if v_job.status <> 'completed' then raise exception 'RECOVERY_REPORT_EXECUTION_JOB_NOT_COMPLETED'; end if;
  if coalesce(v_job.source_hash,'') <> p_source_hash then raise exception 'RECOVERY_SOURCE_HASH_MISMATCH'; end if;
  if coalesce(v_job.checkpoint->>'stage','') <> 'rendered' then raise exception 'RECOVERY_REPORT_EXECUTION_STAGE_NOT_RENDERED'; end if;

  select * into v_import
  from public.import_jobs
  where id = p_import_job_id and company_id = p_company_id
  for update;
  if not found then raise exception 'RECOVERY_IMPORT_JOB_NOT_FOUND'; end if;
  if v_import.file_record_id is null then raise exception 'RECOVERY_IMPORT_SOURCE_RECORD_MISSING'; end if;

  select * into v_current_source
  from public.file_records
  where id = v_import.file_record_id and company_id = p_company_id
  for update;
  if not found then raise exception 'RECOVERY_IMPORT_SOURCE_RECORD_NOT_FOUND'; end if;

  v_source_file_name := nullif(v_import.result_summary->>'file_name', '');

  if v_current_source.file_hash = p_source_hash
     and v_current_source.security_status = 'passed'
     and v_current_source.status in ('ready','processed','verified') then
    v_source_record := v_current_source;
  else
    select * into v_source_record
    from public.file_records
    where company_id = p_company_id
      and file_hash = p_source_hash
      and security_status = 'passed'
      and status in ('ready','processed','verified')
      and (v_source_file_name is null or file_name = v_source_file_name)
    order by created_at desc, id desc
    limit 1
    for update;

    if not found then
      raise exception 'RECOVERY_SOURCE_RECORD_HASH_NOT_VERIFIED';
    end if;
  end if;

  v_source_storage_bucket := nullif(v_source_record.metadata->>'storage_bucket', '');
  v_source_storage_path := nullif(v_source_record.metadata->>'storage_path', '');
  if v_source_storage_bucket is null or v_source_storage_path is null then
    raise exception 'RECOVERY_SOURCE_RECORD_STORAGE_MISSING';
  end if;

  select * into v_commit
  from public.canonical_import_commits c
  where c.company_id = p_company_id
    and c.entity_type = p_entity_type
    and c.source_hash = p_source_hash
  order by c.committed_at desc
  limit 1
  for update;
  if not found then raise exception 'RECOVERY_CANONICAL_COMMIT_NOT_FOUND'; end if;
  if v_commit.committed_count <> p_row_count then raise exception 'RECOVERY_CANONICAL_COMMIT_COUNT_MISMATCH'; end if;

  select count(*)::integer into v_canonical_count
  from public.canonical_dataset_records r
  where r.company_id = p_company_id
    and r.source_hash = p_source_hash
    and r.semantic_domain = case when p_entity_type like 'generic:%' then substr(p_entity_type, 9) else p_entity_type end;
  if v_canonical_count <> p_row_count then raise exception 'RECOVERY_CANONICAL_DATASET_COUNT_MISMATCH'; end if;

  v_evidence := coalesce(v_job.evidence, '{}'::jsonb)
    || jsonb_build_object(
      'renderedOutput', p_rendered_output,
      'sourceHash', p_source_hash,
      'sourceRowCount', p_row_count,
      'authoritativeCurrentRowCount', p_row_count,
      'recoveredFromCompletedDurableJob', true,
      'recoveryContract', 'recover_completed_report_execution_result:v2'
    );

  update public.report_execution_jobs
  set evidence = v_evidence
  where id = p_report_execution_job_id and company_id = p_company_id;

  update public.report_execution_tasks
  set evidence = coalesce(evidence, '{}'::jsonb) || jsonb_build_object(
    'renderedOutput', p_rendered_output,
    'recoveredFromCompletedDurableJob', true,
    'recoveryContract', 'recover_completed_report_execution_result:v2'
  )
  where report_execution_job_id = p_report_execution_job_id
    and company_id = p_company_id
    and stage = 'rendered'
    and status = 'completed';

  v_result_summary := coalesce(v_import.result_summary, '{}'::jsonb)
    || jsonb_build_object(
      'execution_job_id', p_report_execution_job_id,
      'rendered_output', p_rendered_output,
      'committed', p_row_count,
      'rendered_rows', p_row_count,
      'report_execution_status', 'completed',
      'recovered_from_completed_durable_job', true,
      'source_file_record_id', v_source_record.id,
      'source_storage_bucket', v_source_storage_bucket,
      'source_storage_path', v_source_storage_path,
      'source_hash', p_source_hash,
      'source_record_pending_hash', false,
      'source_record_security_status', v_source_record.security_status
    );

  perform set_config('app.import_finish_job_id', p_import_job_id::text, true);
  perform set_config('app.import_finish_company_id', p_company_id::text, true);

  if v_import.status in ('queued','processing') then
    update public.import_jobs
    set status = 'completed',
        progress = 100,
        processed_rows = p_row_count,
        total_rows = greatest(coalesce(total_rows, p_row_count), p_row_count),
        source_fingerprint = coalesce(source_fingerprint, p_source_hash),
        file_record_id = v_source_record.id,
        completed_at = now(),
        duration_ms = case when started_at is null then duration_ms else extract(epoch from (now() - started_at)) * 1000 end,
        result_summary = v_result_summary,
        error_message = null
    where id = p_import_job_id and company_id = p_company_id;
  elsif v_import.status = 'completed' then
    update public.import_jobs
    set source_fingerprint = coalesce(source_fingerprint, p_source_hash),
        file_record_id = v_source_record.id,
        result_summary = v_result_summary
    where id = p_import_job_id and company_id = p_company_id;
  else
    raise exception 'RECOVERY_IMPORT_JOB_TERMINAL:%', v_import.status;
  end if;

  return jsonb_build_object(
    'recovered', true,
    'importJobId', p_import_job_id,
    'reportExecutionJobId', p_report_execution_job_id,
    'sourceHash', p_source_hash,
    'entityType', p_entity_type,
    'rowCount', p_row_count,
    'sourceFileRecordId', v_source_record.id,
    'sourceStorageBucket', v_source_storage_bucket,
    'sourceStoragePath', v_source_storage_path,
    'importStatus', 'completed'
  );
end;
$function$;

revoke all on function public.recover_completed_report_execution_result(uuid, uuid, uuid, text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.recover_completed_report_execution_result(uuid, uuid, uuid, text, text, integer, jsonb) to service_role;
