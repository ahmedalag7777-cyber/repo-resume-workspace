-- Keep real-source cohort eligibility aligned with the file formats parsed by generic intelligence.
-- Forward-only change; previously applied migrations remain immutable.
DROP INDEX IF EXISTS public.idx_report_value_cohort_candidates_source;

create or replace function public.get_report_value_cohort_candidates(
  p_limit integer default 100,
  p_company_id uuid default null
)
returns table(
  job_id uuid,
  company_id uuid,
  source_path text,
  source_hash text,
  job_key text,
  checkpoint jsonb,
  evidence jsonb,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_catalog
as $function$
  with jobs as (
    select j.id, j.company_id, j.source_path, j.source_hash, j.job_key, j.checkpoint, j.evidence, j.updated_at
    from public.report_execution_jobs j
    where j.status = 'completed'
      and j.checkpoint->>'stage' = 'rendered'
      and j.company_id is not null
      and j.source_hash ~ '^sha256:[0-9a-fA-F]{64}$'
      and j.source_path ~* '\.(xlsx|xls|xlsm|csv|tsv|ods|pdf|docx|doc|rtf|json|jsonl|xml|yaml|yml|txt|md|markdown|jpg|jpeg|png|webp|tiff|bmp)$'
      and j.source_path !~* '^canonical-import:'
      and j.job_key ~ '^canonical-import:generic:'
      and (j.evidence->'renderedOutput'->>'importId') ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,35}$'
      and (p_company_id is null or j.company_id = p_company_id)
  ),
  eligible as (
    select distinct on (j.source_hash)
      j.id as job_id,
      j.company_id,
      j.source_path,
      j.source_hash,
      j.job_key,
      j.checkpoint,
      j.evidence,
      j.updated_at
    from jobs j
    join lateral (
      select fr.id
      from public.file_records fr
      where fr.company_id = j.company_id
        and fr.file_hash = j.source_hash
        and fr.security_status = 'passed'
        and fr.status in ('ready','processed','verified')
        and coalesce(fr.metadata->>'fixture_type','') <> 'synthetic-realistic'
        and coalesce(fr.metadata->>'catalog_id','') <> 'report-intelligence.48'
      limit 1
    ) fr on true
    join lateral (
      select ij.id
      from public.import_jobs ij
      where ij.id = (j.evidence->'renderedOutput'->>'importId')::uuid
        and ij.company_id = j.company_id
        and ij.file_record_id = fr.id
      limit 1
    ) ij on true
    join lateral (
      select sas.id
      from public.source_analysis_snapshots sas
      where sas.company_id = j.company_id
        and sas.import_job_id = ij.id
        and sas.analysis_status = 'analyzed'
      limit 1
    ) sas on true
    order by j.source_hash, lower(j.source_path), j.company_id, j.id
  )
  select *
  from eligible
  order by lower(source_path), source_hash, company_id, job_id
  limit least(greatest(coalesce(p_limit,100),1),500);
$function$;

CREATE INDEX IF NOT EXISTS idx_report_value_cohort_candidates_source
  ON public.report_execution_jobs
  USING btree (source_hash, lower(source_path), company_id, id)
  WHERE status = 'completed'
    AND checkpoint ->> 'stage' = 'rendered'
    AND company_id IS NOT NULL
    AND source_hash ~ '^sha256:[0-9a-fA-F]{64}$'
    AND source_path ~* '\.(xlsx|xls|xlsm|csv|tsv|ods|pdf|docx|doc|rtf|json|jsonl|xml|yaml|yml|txt|md|markdown|jpg|jpeg|png|webp|tiff|bmp)$'
    AND source_path !~* '^canonical-import:'
    AND job_key ~ '^canonical-import:generic:'
    AND (evidence -> 'renderedOutput' ->> 'importId') ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,35}$';


-- Keep the cohort runtime restricted to the trusted server-side reader.
-- This function can enumerate source-bound report candidates when no tenant is supplied.
REVOKE ALL ON FUNCTION public.get_report_value_cohort_candidates(integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_value_cohort_candidates(integer, uuid)
  TO service_role;
