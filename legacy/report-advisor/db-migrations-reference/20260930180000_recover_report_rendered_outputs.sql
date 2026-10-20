create or replace function public.recover_missing_report_rendered_outputs(
  p_company_id uuid
)
returns table(
  repaired_job_id uuid,
  repaired_source_path text,
  repaired_source_hash text,
  repaired_output_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  v_specialty text;
  v_outputs jsonb;
  v_evidence jsonb;
  v_metrics jsonb;
  v_import_id uuid;
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
          and c.committed_count = s.row_count
      )
    order by j.completed_at asc nulls first, j.id asc
  loop
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
        'key','executive',
        'path','/reports/executive',
        'label','التقرير التنفيذي',
        'stage','DECISION OUTPUT',
        'importId',v_import_id,
        'rendered',true,
        'sourceHash',r.source_hash,
        'sourceBound',true,
        'eligibility','EVIDENCE_REQUIRED'
      ),
      jsonb_build_object(
        'key','evidence',
        'path','/trust',
        'label','الثقة والأدلة',
        'stage','EVIDENCE OUTPUT',
        'importId',v_import_id,
        'rendered',true,
        'sourceHash',r.source_hash,
        'sourceBound',true,
        'eligibility','EVIDENCE_REQUIRED'
      ),
      jsonb_build_object(
        'key','decision',
        'path','/decision-experience',
        'label','مساحة القرار',
        'stage','DECISION SURFACE',
        'importId',v_import_id,
        'rendered',true,
        'sourceHash',r.source_hash,
        'sourceBound',true,
        'eligibility','EVIDENCE_REQUIRED'
      ),
      jsonb_build_object(
        'key','work-center',
        'path','/work-center',
        'label','مركز العمل',
        'stage','ACTION SURFACE',
        'importId',v_import_id,
        'rendered',true,
        'sourceHash',r.source_hash,
        'sourceBound',true,
        'eligibility','EVIDENCE_REQUIRED'
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
          'stage','DOMAIN OUTPUT',
          'specialty',v_specialty,
          'importId',v_import_id,
          'rendered',true,
          'sourceHash',r.source_hash,
          'sourceBound',true,
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
          'authoritativeCurrentRowCount', coalesce(nullif(r.evidence->>'authoritativeCurrentRowCount','')::integer, r.row_count),
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
        'recoveryContract', '2026-09-30-report-output-v1'
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
$$;