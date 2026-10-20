-- Resolve PostgREST PGRST203 by ensuring repair-only import commits require all seven arguments.
DROP FUNCTION public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean);

CREATE FUNCTION public.import_commit_batch(p_company_id uuid, p_entity_type text, p_rows jsonb, p_null_policy text, p_source_hash text, p_import_job_id uuid, p_repair boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET statement_timeout TO '30s'
AS $function$
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
$function$
;

REVOKE ALL ON FUNCTION public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean) TO service_role;
