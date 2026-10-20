create or replace function public.accept_completed_report_evidence_batch(
  p_company_id uuid,
  p_limit integer default 100
)
returns table(
  job_id uuid,
  source_path text,
  source_hash text,
  state text,
  reason text
)
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
set statement_timeout to '30s'
as $function$
declare
  r record;
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_rendered jsonb;
  v_analysis record;
  v_import public.import_jobs%rowtype;
  v_source public.file_records%rowtype;
  v_commit_count integer;
  v_canonical_count integer;
  v_reason text;
  v_state text;
  v_evidence jsonb;
  v_passport jsonb;
  v_entity_type text;
  v_domain text;
begin
  if p_company_id is null then raise exception 'REPORT_EVIDENCE_TENANT_REQUIRED'; end if;

  for r in
    select j.id,j.source_path,j.source_hash,j.job_key,j.checkpoint,j.evidence,j.completed_at
    from public.report_execution_jobs j
    where j.company_id=p_company_id
      and j.status='completed'
      and coalesce(j.checkpoint->>'stage','')='rendered'
      and j.job_key like 'canonical-import:generic:%'
      and coalesce(j.evidence->'renderedOutput'->>'evidenceStatus','AWAITING_EVIDENCE_SNAPSHOT') <> 'VERIFIED'
      and j.source_path ~* '\.(xlsx|xls|xlsm|csv|tsv|ods|pdf|docx|doc|rtf|json|jsonl|txt|md|markdown|jpg|jpeg|png|webp|tiff|bmp)$'
      and j.source_path !~ '^(customer|product|invoice)-[0-9]+'
    order by j.completed_at asc nulls first,j.id asc
    limit v_limit
  loop
    v_rendered:=coalesce(r.evidence->'renderedOutput','{}'::jsonb);
    v_commit_count:=0;
    v_canonical_count:=0;
    v_reason:=null;
    v_state:='REVIEW';
    v_entity_type:=split_part(r.job_key,':',2)||':'||split_part(r.job_key,':',3);
    v_domain:=split_part(r.job_key,':',3);

    if r.source_hash !~ '^sha256:[0-9a-fA-F]{64}$' then v_reason:='SOURCE_HASH_INVALID'; end if;

    if v_reason is null then
      begin
        select * into v_import
        from public.import_jobs i
        where i.company_id=p_company_id
          and i.id=nullif(v_rendered->>'importId','')::uuid
        for update;
      exception when invalid_text_representation then
        v_reason:='IMPORT_JOB_ID_INVALID';
      end;
      if v_reason is null and v_import.id is null then v_reason:='IMPORT_JOB_NOT_FOUND'; end if;
    end if;

    if v_reason is null then
      select * into v_source
      from public.file_records f
      where f.company_id=p_company_id
        and f.id=v_import.file_record_id
        and f.file_hash=r.source_hash
      limit 1
      for update;

      if v_source.id is null then
        v_reason:='SOURCE_FILE_RECORD_HASH_MISMATCH';
      elsif v_source.security_status <> 'passed'
         or v_source.status not in ('ready','processed','verified') then
        v_reason:='SOURCE_FILE_RECORD_SECURITY_PENDING';
      end if;
    end if;

    if v_reason is null then
      select s.id,s.analysis_status,s.quality_score,s.row_count,s.column_count,s.source_format
      into v_analysis
      from public.source_analysis_snapshots s
      where s.company_id=p_company_id
        and s.source_hash=r.source_hash
        and s.analysis_status='analyzed'
      order by s.created_at desc,s.id desc
      limit 1;

      if v_analysis.id is null then
        v_reason:='SOURCE_ANALYSIS_MISSING';
      elsif coalesce(v_analysis.quality_score,0) < 70 then
        v_reason:='QUALITY_BELOW_EVIDENCE_THRESHOLD';
      elsif coalesce(v_analysis.row_count,0) <> coalesce((v_rendered->>'rowCount')::integer,-1) then
        v_reason:='ANALYSIS_RENDER_ROW_COUNT_MISMATCH';
      end if;
    end if;

    if v_reason is null then
      select coalesce(sum(c.committed_count),0)::integer
      into v_commit_count
      from public.canonical_import_commits c
      where c.company_id=p_company_id
        and c.entity_type=v_entity_type
        and c.source_hash=r.source_hash;

      select count(*)::integer
      into v_canonical_count
      from public.canonical_dataset_records cdr
      where cdr.company_id=p_company_id
        and cdr.semantic_domain=v_domain
        and cdr.source_hash=r.source_hash;

      if v_commit_count <> coalesce((v_rendered->>'rowCount')::integer,-1)
         or v_canonical_count <> coalesce((v_rendered->>'rowCount')::integer,-1)
         or v_commit_count <> v_canonical_count then
        v_reason:=format(
          'CANONICAL_ROW_COVERAGE_GAP:source=%s;commit=%s;canonical=%s',
          coalesce(v_rendered->>'rowCount','null'),
          v_commit_count,
          v_canonical_count
        );
      end if;
    end if;

    if v_reason is null then
      v_state:='VERIFIED';
      v_passport:=jsonb_build_object(
        'status','VERIFIED',
        'acceptedAt',clock_timestamp(),
        'reportExecutionJobId',r.id,
        'importJobId',v_import.id,
        'source',jsonb_build_object(
          'path',r.source_path,
          'hash',r.source_hash,
          'fileRecordId',v_source.id,
          'fileName',v_source.file_name,
          'detectedFormat',v_source.detected_format,
          'securityStatus',v_source.security_status
        ),
        'analysis',jsonb_build_object(
          'snapshotId',v_analysis.id,
          'status',v_analysis.analysis_status,
          'qualityScore',v_analysis.quality_score,
          'rowCount',v_analysis.row_count,
          'columnCount',v_analysis.column_count,
          'sourceFormat',v_analysis.source_format
        ),
        'canonical',jsonb_build_object(
          'entityType',v_entity_type,
          'committedRows',v_commit_count,
          'canonicalRows',v_canonical_count,
          'coverage','FULL'
        ),
        'trust',jsonb_build_object(
          'state',coalesce(v_rendered->>'trustState','TRUSTED'),
          'qualityScore',coalesce(v_rendered->>'qualityScore',v_analysis.quality_score::text)
        )
      );

      v_rendered:=v_rendered||jsonb_build_object(
        'evidenceStatus','VERIFIED',
        'evidenceAcceptance','CANONICAL_SOURCE_ACCEPTED',
        'evidencePassport',v_passport
      );
      v_evidence:=coalesce(r.evidence,'{}'::jsonb)
        || jsonb_build_object(
          'evidencePassport',v_passport,
          'evidenceAcceptedAt',clock_timestamp(),
          'renderedOutput',v_rendered
        );

      update public.report_execution_jobs
      set evidence=v_evidence,updated_at=clock_timestamp()
      where id=r.id and company_id=p_company_id;

      update public.report_execution_tasks
      set evidence=coalesce(evidence,'{}'::jsonb)
        || jsonb_build_object(
          'evidencePassport',v_passport,
          'evidenceStatus','VERIFIED',
          'evidenceAcceptance','CANONICAL_SOURCE_ACCEPTED'
        )
      where report_execution_job_id=r.id
        and company_id=p_company_id
        and stage='rendered'
        and status='completed';

      reason:='SOURCE_HASH + FILE_RECORD + ANALYSIS + CANONICAL_COVERAGE VERIFIED';
    else
      v_state:=case when v_reason like 'CANONICAL_ROW_COVERAGE_GAP:%' then 'GAP_DETECTED' else 'REVIEW' end;
      reason:=v_reason;
    end if;

    job_id:=r.id;
    source_path:=r.source_path;
    source_hash:=r.source_hash;
    state:=v_state;
    return next;
  end loop;
end;
$function$;

revoke all on function public.accept_completed_report_evidence_batch(uuid, integer) from public, anon, authenticated;
grant execute on function public.accept_completed_report_evidence_batch(uuid, integer) to service_role;