-- Canonical recovery for completed report analysis/render outputs.
-- These contracts never re-import sources and never mutate canonical dataset rows.

CREATE OR REPLACE FUNCTION public.recover_missing_source_analysis_snapshots(p_company_id uuid)
 RETURNS TABLE(recovered_source_hash text, recovered_job_id uuid, recovered_row_count integer, recovered_column_count integer, recovered_quality_score numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  r record;
  c record;
  v_columns jsonb;
  v_preview jsonb;
  v_dataset jsonb;
  v_row_count integer;
  v_column_count integer;
  v_total_nonnull numeric;
  v_total_cells numeric;
  v_quality numeric;
  v_nonnull integer;
  v_unique integer;
  v_numeric integer;
  v_boolean integer;
  v_date_like integer;
  v_data_type text;
  v_mapped_field text;
  v_requires_review boolean;
  v_quality_issues jsonb;
  v_statistics jsonb;
  v_sample_values jsonb;
  v_source_path text;
  v_source_format text;
  v_file_name text;
  v_import_job_id uuid;
  v_canonical_commit_count integer;
begin
  if p_company_id is null then
    raise exception 'SOURCE_ANALYSIS_RECOVERY_TENANT_REQUIRED';
  end if;

  for r in
    select
      j.id as report_job_id,
      j.source_hash,
      j.source_path,
      j.job_key,
      coalesce(nullif(j.evidence->>'importId',''), null)::text as evidence_import_id,
      fr.file_name,
      fr.file_extension,
      fr.detected_format,
      fr.metadata->>'storage_bucket' as storage_bucket,
      fr.metadata->>'storage_path' as storage_path
    from public.report_execution_jobs j
    left join lateral (
      select fr.*
      from public.file_records fr
      where fr.company_id=p_company_id
        and fr.file_hash=j.source_hash
        and fr.status='ready'
        and fr.security_status='passed'
      order by fr.created_at desc, fr.id desc
      limit 1
    ) fr on true
    where j.company_id=p_company_id
      and j.status='completed'
      and coalesce(j.checkpoint->>'stage','')='rendered'
      and j.job_key like 'canonical-import:generic:%'
      and not exists (
        select 1
        from public.source_analysis_snapshots s
        where s.company_id=j.company_id
          and s.source_hash=j.source_hash
          and s.analysis_status='analyzed'
      )
      and exists (
        select 1
        from public.canonical_dataset_records cr
        where cr.company_id=j.company_id
          and cr.source_hash=j.source_hash
      )
      and exists (
        select 1
        from public.canonical_import_commits cc
        where cc.company_id=j.company_id
          and cc.source_hash=j.source_hash
      )
    order by j.completed_at asc nulls first, j.id asc
  loop
    select count(*)::integer into v_row_count
    from public.canonical_dataset_records cr
    where cr.company_id=p_company_id and cr.source_hash=r.source_hash;

    select coalesce(sum(cc.committed_count),0)::integer into v_canonical_commit_count
    from public.canonical_import_commits cc
    where cc.company_id=p_company_id and cc.source_hash=r.source_hash;

    if v_row_count < 1 or v_canonical_commit_count <> v_row_count then
      continue;
    end if;

    select count(*)::integer into v_column_count
    from (
      select distinct key_name
      from public.canonical_dataset_records cr
      cross join lateral jsonb_object_keys(cr.data) key_name
      where cr.company_id=p_company_id and cr.source_hash=r.source_hash
    ) keys;

    if v_column_count < 1 then
      continue;
    end if;

    v_columns := '[]'::jsonb;
    v_total_nonnull := 0;

    for c in
      select key_name
      from (
        select distinct key_name
        from public.canonical_dataset_records cr
        cross join lateral jsonb_object_keys(cr.data) key_name
        where cr.company_id=p_company_id and cr.source_hash=r.source_hash
      ) keys
      order by key_name
    loop
      select
        count(*) filter (
          where cr.data ? c.key_name
            and coalesce(jsonb_typeof(cr.data->c.key_name),'null') <> 'null'
            and coalesce(cr.data->>c.key_name,'') <> ''
        )::integer,
        count(distinct cr.data->>c.key_name) filter (
          where cr.data ? c.key_name
            and coalesce(jsonb_typeof(cr.data->c.key_name),'null') <> 'null'
            and coalesce(cr.data->>c.key_name,'') <> ''
        )::integer,
        count(*) filter (
          where cr.data ? c.key_name
            and jsonb_typeof(cr.data->c.key_name)='number'
        )::integer,
        count(*) filter (
          where cr.data ? c.key_name
            and jsonb_typeof(cr.data->c.key_name)='boolean'
        )::integer,
        count(*) filter (
          where cr.data ? c.key_name
            and coalesce(jsonb_typeof(cr.data->c.key_name),'null') <> 'null'
            and cr.data->>c.key_name ~ '^\\d{4}-\\d{2}-\\d{2}$'
        )::integer
      into v_nonnull, v_unique, v_numeric, v_boolean, v_date_like
      from public.canonical_dataset_records cr
      where cr.company_id=p_company_id and cr.source_hash=r.source_hash;

      v_total_nonnull := v_total_nonnull + v_nonnull;

      if v_nonnull > 0 and v_numeric=v_nonnull then
        v_data_type := 'decimal';
      elsif v_nonnull > 0 and v_boolean=v_nonnull then
        v_data_type := 'boolean';
      elsif v_nonnull > 0 and v_date_like=v_nonnull and lower(c.key_name) like '%date%' then
        v_data_type := 'date';
      elsif v_nonnull = 0 then
        v_data_type := 'unknown';
      else
        v_data_type := 'text';
      end if;

      v_mapped_field := case
        when lower(c.key_name) in ('customer_name','اسم العميل') then 'customer_name'
        when lower(c.key_name) in ('phone','رقم الجوال') then 'phone'
        when lower(c.key_name) in ('status','توقيف') then 'status'
        when lower(c.key_name) in ('branch_id','رقم الفرع') then 'branch_id'
        when lower(c.key_name) in ('invoice_number','رقم الفاتوره') then 'invoice_number'
        when lower(c.key_name) in ('invoice_type','نوع الفاتوره') then 'invoice_type'
        when lower(c.key_name) in ('date','التاريخ') and split_part(r.job_key,':',3)='sales' then 'invoice_date'
        when lower(c.key_name) in ('total','اجمالي الفاتوره') and split_part(r.job_key,':',3)='sales' then 'total'
        when lower(c.key_name) in ('charges','الاعباء') and split_part(r.job_key,':',3)='sales' then 'charges'
        when lower(c.key_name) in ('debit','مدين') and split_part(r.job_key,':',3)='payments' then 'debit'
        when lower(c.key_name) in ('credit','دائن') and split_part(r.job_key,':',3)='payments' then 'credit'
        when lower(c.key_name) in ('currency','العمله') and split_part(r.job_key,':',3)='payments'
             and exists (
               select 1 from public.canonical_dataset_records x
               where x.company_id=p_company_id and x.source_hash=r.source_hash
                 and x.data->>c.key_name = 'YER'
             ) then 'currency'
        when lower(c.key_name) in ('description','البيان') and split_part(r.job_key,':',3)='payments' then 'description'
        when lower(c.key_name) in ('date','التاريخ') and split_part(r.job_key,':',3)='payments' then 'date'
        when lower(c.key_name) in ('sku','رقم الصنف') then 'sku'
        when lower(c.key_name) in ('name','اسم الصنف') then 'name'
        else null
      end;

      v_quality_issues := '[]'::jsonb;
      if v_nonnull < ceil(v_row_count * 0.5) then
        v_quality_issues := v_quality_issues || jsonb_build_array('أكثر من 50% من القيم فارغة');
      end if;
      v_requires_review := jsonb_array_length(v_quality_issues) > 0;

      if v_numeric = v_nonnull and v_nonnull > 0 then
        select jsonb_build_object(
          'count', count(*) filter (where cr.data ? c.key_name and jsonb_typeof(cr.data->c.key_name)='number'),
          'sum', sum((cr.data->>c.key_name)::numeric),
          'mean', avg((cr.data->>c.key_name)::numeric),
          'min', min((cr.data->>c.key_name)::numeric),
          'max', max((cr.data->>c.key_name)::numeric)
        ) into v_statistics
        from public.canonical_dataset_records cr
        where cr.company_id=p_company_id and cr.source_hash=r.source_hash;
      else
        v_statistics := jsonb_build_object('count', v_nonnull);
      end if;

      select coalesce(
        (
          select jsonb_agg(sample_value)
          from (
            select cr.data->c.key_name as sample_value
            from public.canonical_dataset_records cr
            where cr.company_id=p_company_id
              and cr.source_hash=r.source_hash
              and cr.data ? c.key_name
              and jsonb_typeof(cr.data->c.key_name) <> 'null'
            order by cr.row_number
            limit 5
          ) samples
        ),
        '[]'::jsonb
      ) into v_sample_values;

      v_columns := v_columns || jsonb_build_array(
        jsonb_build_object(
          'name', c.key_name,
          'dataType', v_data_type,
          'nullCount', greatest(v_row_count-v_nonnull,0),
          'statistics', v_statistics,
          'mappedField', v_mapped_field,
          'uniqueCount', v_unique,
          'uniqueRatio', case when v_nonnull > 0 then round(v_unique::numeric/v_nonnull,6) else 0 end,
          'sampleValues', v_sample_values,
          'qualityIssues', v_quality_issues,
          'requiresReview', v_requires_review,
          'mappingConfidence', case when v_mapped_field is null then 0 else null end,
          'mappingEvidence', jsonb_build_object(
            'matchedBy', case when v_mapped_field is null then 'unmapped' else 'canonical-dataset-field' end,
            'confidence', case when v_mapped_field is null then 0 else null end,
            'canonicalField', v_mapped_field,
            'sourceHeader', c.key_name,
            'requiresReview', v_requires_review
          )
        )
      );
    end loop;

    select coalesce(
      (
        select jsonb_agg(cr.data order by cr.row_number)
        from (
          select cr.data, cr.row_number
          from public.canonical_dataset_records cr
          where cr.company_id=p_company_id and cr.source_hash=r.source_hash
          order by cr.row_number
          limit 20
        ) cr
      ),
      '[]'::jsonb
    ) into v_preview;

    v_total_cells := (v_row_count::numeric * v_column_count::numeric);
    v_quality := case when v_total_cells > 0 then round((v_total_nonnull / v_total_cells) * 100, 2) else 0 end;

    v_file_name := coalesce(r.file_name, nullif(r.source_path,''), r.source_hash);
    v_source_path := coalesce(
      r.storage_path,
      r.source_path,
      r.source_hash
    );
    v_source_format := lower(coalesce(nullif(r.detected_format,''), nullif(r.file_extension,''), 'unknown'));

    select i.id into v_import_job_id
    from public.import_jobs i
    where i.company_id=p_company_id
      and (
        i.result_summary->>'execution_job_id' = r.report_job_id::text
        or (i.result_summary->>'file_name') = v_file_name
      )
    order by (i.result_summary->>'execution_job_id' = r.report_job_id::text) desc, i.created_at desc
    limit 1;

    v_dataset := jsonb_build_array(
      jsonb_build_object(
        'name', v_file_name,
        'columns', v_columns,
        'preview', v_preview,
        'rowCount', v_row_count,
        'columnCount', v_column_count,
        'recovery', jsonb_build_object(
          'method','canonical_dataset_recovery_v1',
          'rawSourceReparse',false,
          'sourceHash',r.source_hash,
          'canonicalRowCount',v_row_count,
          'canonicalCommitCount',v_canonical_commit_count
        )
      )
    );

    insert into public.source_analysis_snapshots(
      company_id,import_job_id,source_hash,source_path,source_format,analysis_status,
      entity_type,quality_score,row_count,column_count,datasets,canonical_text,visual_assets,warnings,metadata
    )
    select
      p_company_id,v_import_job_id,r.source_hash,v_source_path,v_source_format,'analyzed',
      split_part(r.job_key,':',3),v_quality,v_row_count,v_column_count,v_dataset,
      format('Recovered analysis from canonical dataset for %s. No raw-source reparse was performed.',v_file_name),
      '[]'::jsonb,
      jsonb_build_array('RECOVERED_FROM_CANONICAL_DATASET','RAW_SOURCE_REPARSE_NOT_PERFORMED','QUALITY_SCORE_IS_COMPLETENESS_ONLY'),
      jsonb_build_object(
        'analysisMethod','canonical_dataset_recovery_v1',
        'recoveredAt',now(),
        'sourceHash',r.source_hash,
        'sourceFileRecordId',nullif(r.storage_path,''),
        'canonicalRowCount',v_row_count,
        'canonicalCommitCount',v_canonical_commit_count,
        'qualityMethod','non_null_cells_divided_by_total_cells'
      )
    where not exists (
      select 1
      from public.source_analysis_snapshots existing
      where existing.company_id=p_company_id
        and existing.source_hash=r.source_hash
        and existing.analysis_status='analyzed'
    );

    if found then
      recovered_source_hash := r.source_hash;
      recovered_job_id := r.report_job_id;
      recovered_row_count := v_row_count;
      recovered_column_count := v_column_count;
      recovered_quality_score := v_quality;
      return next;
    end if;
  end loop;
end;
$function$;

revoke all on function public.recover_missing_source_analysis_snapshots(uuid) from public;
revoke all on function public.recover_missing_source_analysis_snapshots(uuid) from anon;
revoke all on function public.recover_missing_source_analysis_snapshots(uuid) from authenticated;
grant execute on function public.recover_missing_source_analysis_snapshots(uuid) to service_role;

CREATE OR REPLACE FUNCTION public.recover_missing_report_rendered_outputs(p_company_id uuid)
 RETURNS TABLE(repaired_job_id uuid, repaired_source_path text, repaired_source_hash text, repaired_output_count integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  r record;
  v_specialty text;
  v_outputs jsonb;
  v_evidence jsonb;
  v_metrics jsonb;
  v_import_id uuid;
  v_committed_count integer;
  v_canonical_dataset_count integer;
  v_authoritative_current_row_count integer;
begin
  if p_company_id is null then
    raise exception 'REPORT_OUTPUT_RECOVERY_TENANT_REQUIRED';
  end if;

  for r in
    select
      j.id,
      j.company_id,
      j.source_path,
      j.source_hash,
      j.job_key,
      j.status,
      j.checkpoint,
      j.evidence,
      j.completed_at,
      s.id as analysis_snapshot_id,
      s.import_job_id,
      s.quality_score,
      s.row_count,
      s.datasets
    from public.report_execution_jobs j
    join lateral (
      select s.*
      from public.source_analysis_snapshots s
      where s.company_id = j.company_id
        and s.source_hash = j.source_hash
        and s.analysis_status = 'analyzed'
      order by s.created_at desc
      limit 1
    ) s on true
    where j.company_id = p_company_id
      and j.status = 'completed'
      and coalesce(j.checkpoint->>'stage','') = 'rendered'
      and coalesce(j.evidence, '{}'::jsonb) -> 'renderedOutput' is null
      and j.job_key like 'canonical-import:generic:%'
      and j.source_path ~* '\.(xlsx|xls|csv|pdf|docx|json|txt)$'
      and j.source_path !~ '^(customer|product|invoice)-[0-9]+'
      and exists (
        select 1
        from public.canonical_import_commits c
        where c.company_id = j.company_id
          and c.source_hash = j.source_hash
          and c.committed_count between 1 and s.row_count
      )
    order by j.completed_at asc nulls first, j.id asc
  loop
    select coalesce(sum(c.committed_count),0)::integer
      into v_committed_count
    from public.canonical_import_commits c
    where c.company_id = p_company_id
      and c.source_hash = r.source_hash;

    select count(*)::integer
      into v_canonical_dataset_count
    from public.canonical_dataset_records d
    where d.company_id = p_company_id
      and d.source_hash = r.source_hash;

    if v_committed_count < 1 or v_committed_count <> v_canonical_dataset_count or v_committed_count > r.row_count then
      continue;
    end if;

    v_authoritative_current_row_count := v_committed_count;
    v_import_id := r.import_job_id;

    v_specialty := case
      when split_part(r.job_key, ':', 3) in ('sales','purchases','inventory','payments','receivables','profitability')
        then split_part(r.job_key, ':', 3)
      when split_part(r.job_key, ':', 3) = 'products' then 'inventory'
      when split_part(r.job_key, ':', 3) = 'customers' then 'receivables'
      when coalesce(r.datasets::text, '') ~* '(supplier|vendor|مورد)' and coalesce(r.datasets::text, '') ~* '(purchase|purchases|شراء|مشتريات)'
        then 'purchases'
      when coalesce(r.datasets::text, '') ~* '(receivable|outstanding|customer_balance|due_date|aging|ذمم|الاجل|آجل)'
        then 'receivables'
      when coalesce(r.datasets::text, '') ~* '(sales|net_sales|sales_amount|invoice_number|مبيعات|فواتير)'
        and coalesce(r.datasets::text, '') ~* '(quantity|amount|total|net)'
        then 'sales'
      when coalesce(r.datasets::text, '') ~* '(payment|payments|cash|cashier|transaction|تحصيل|الصراف|الصندوق|مدفوع)'
        then 'payments'
      when coalesce(r.datasets::text, '') ~* '(inventory|warehouse|stock|selling_price|cost_price|quantity|مخزون|المخزن|الرصيد)'
        then 'inventory'
      else null
    end;

    v_outputs := jsonb_build_array(
      jsonb_build_object(
        'key','executive','path','/reports/executive','label','التقرير التنفيذي',
        'stage','DECISION OUTPUT','importId',v_import_id,'rendered',true,
        'sourceHash',r.source_hash,'sourceBound',true,'eligibility','EVIDENCE_REQUIRED'
      ),
      jsonb_build_object(
        'key','evidence','path','/trust','label','الثقة والأدلة',
        'stage','EVIDENCE OUTPUT','importId',v_import_id,'rendered',true,
        'sourceHash',r.source_hash,'sourceBound',true,'eligibility','EVIDENCE_REQUIRED'
      ),
      jsonb_build_object(
        'key','decision','path','/decision-experience','label','مساحة القرار',
        'stage','DECISION SURFACE','importId',v_import_id,'rendered',true,
        'sourceHash',r.source_hash,'sourceBound',true,'eligibility','EVIDENCE_REQUIRED'
      ),
      jsonb_build_object(
        'key','work-center','path','/work-center','label','مركز العمل',
        'stage','ACTION SURFACE','importId',v_import_id,'rendered',true,
        'sourceHash',r.source_hash,'sourceBound',true,'eligibility','EVIDENCE_REQUIRED'
      )
    );

    if v_specialty is not null then
      v_outputs := v_outputs || jsonb_build_array(
        jsonb_build_object(
          'key','domain-' || v_specialty,
          'path',
            case v_specialty
              when 'sales' then '/reports/sales'
              when 'purchases' then '/reports/purchases'
              when 'inventory' then '/reports/inventory'
              when 'payments' then '/analytics/liquidity'
              when 'receivables' then '/reports/receivables'
              when 'profitability' then '/reports/profitability'
            end,
          'label',
            case v_specialty
              when 'sales' then 'تقرير المبيعات'
              when 'purchases' then 'تقرير المشتريات'
              when 'inventory' then 'تقرير المخزون'
              when 'payments' then 'تحليل السيولة والمدفوعات'
              when 'receivables' then 'تقرير الذمم المدينة'
              when 'profitability' then 'تقرير الربحية'
            end,
          'stage','DOMAIN OUTPUT','specialty',v_specialty,'importId',v_import_id,
          'rendered',true,'sourceHash',r.source_hash,'sourceBound',true,
          'eligibility','EVIDENCE_REQUIRED'
        )
      );
    end if;

    v_metrics := jsonb_build_object(
      'totalAmount', null,
      'uniqueInvoiceCount', null,
      'missingCustomerRows', null,
      'missingInvoiceNumberRows', null,
      'missingInvoiceTypeRows', null,
      'receivableCandidate', null,
      'asOfStart', null,
      'asOfEnd', null,
      'canonicalCommittedRowCount', v_committed_count,
      'sourceAnalyzedRowCount', r.row_count,
      'canonicalCommitGap', greatest(r.row_count - v_committed_count, 0),
      'fieldAvailability', jsonb_build_object(
        'total', coalesce(r.datasets::text,'') ~* '"mappedField":"(total|net_sales|sales_amount|local_amount|outstanding_balance)"',
        'invoiceNumber', coalesce(r.datasets::text,'') ~* '"mappedField":"invoice_number"',
        'customer', coalesce(r.datasets::text,'') ~* '"mappedField":"customer_name"',
        'invoiceType', coalesce(r.datasets::text,'') ~* '"mappedField":"invoice_type"',
        'date', coalesce(r.datasets::text,'') ~* '"mappedField":"(date|invoice_date|due_date)"'
      )
    );

    v_evidence := coalesce(r.evidence, '{}'::jsonb)
      || jsonb_build_object(
        'renderedOutput', jsonb_build_object(
          'outputs', v_outputs,
          'importId', v_import_id,
          'entityType', split_part(r.job_key, ':', 3),
          'sourceHash', r.source_hash,
          'sourceBound', true,
          'renderedAt', now(),
          'rowCount', r.row_count,
          'authoritativeCurrentRowCount', v_authoritative_current_row_count,
          'canonicalCommitGap', greatest(r.row_count - v_authoritative_current_row_count, 0),
          'sourceSpecialty', v_specialty,
          'sourceMetrics', v_metrics,
          'trustState', case
            when r.quality_score::numeric >= 75 then 'TRUSTED'
            when r.quality_score::numeric >= 50 then 'REVIEW'
            else 'BLOCKED'
          end,
          'qualityScore', r.quality_score::numeric,
          'evidenceStatus', 'AWAITING_EVIDENCE_SNAPSHOT',
          'signalStatus', 'AVAILABLE_FROM_CANONICAL_ANALYSIS',
          'intelligenceStatus', 'AVAILABLE_FROM_CANONICAL_ANALYSIS',
          'recommendationStatus', 'NOT_COMMITTED',
          'decisionStatus', 'NO_DECISION_COMMITTED',
          'approvalStatus', 'NOT_COMMITTED',
          'actionStatus', 'NO_ACTION_COMMITTED',
          'outcomeStatus', 'NOT_AVAILABLE',
          'learningStatus', 'NOT_AVAILABLE',
          'benchmarkStatus', 'INSUFFICIENT_SAMPLE',
          'replayStatus', 'NOT_AVAILABLE',
          'canonicalCommitVerified', true,
          'analysisSnapshotId', r.analysis_snapshot_id,
          'contractVersion', '2026-09-30-report-output-v1'
        ),
        'recoveredFromCompletedDurableJob', true,
        'recoveryContract', '2026-09-30-report-output-v2',
        'canonicalCommitGap', greatest(r.row_count - v_authoritative_current_row_count, 0)
      );

    update public.report_execution_jobs
       set evidence = v_evidence,
           updated_at = now()
     where id = r.id
       and company_id = p_company_id
       and status = 'completed'
       and coalesce(evidence->'renderedOutput', 'null'::jsonb) = 'null'::jsonb;

    repaired_job_id := r.id;
    repaired_source_path := r.source_path;
    repaired_source_hash := r.source_hash;
    repaired_output_count := jsonb_array_length(v_outputs);
    return next;
  end loop;
end;
$function$;

revoke all on function public.recover_missing_report_rendered_outputs(uuid) from public;
revoke all on function public.recover_missing_report_rendered_outputs(uuid) from anon;
revoke all on function public.recover_missing_report_rendered_outputs(uuid) from authenticated;
grant execute on function public.recover_missing_report_rendered_outputs(uuid) to service_role;