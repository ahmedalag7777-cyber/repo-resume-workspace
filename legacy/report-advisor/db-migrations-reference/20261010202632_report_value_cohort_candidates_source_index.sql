-- Accelerate the exact candidate predicate/order used by get_report_value_cohort_candidates.
-- Verified Staging EXPLAIN showed a full sequential scan of report_execution_jobs
-- before the lateral evidence checks. This partial index keeps only complete,
-- rendered, source-fingerprinted generic report jobs eligible for cohort proof.
CREATE INDEX IF NOT EXISTS idx_report_value_cohort_candidates_source
  ON public.report_execution_jobs
  USING btree (source_hash, lower(source_path), company_id, id)
  WHERE status = 'completed'
    AND checkpoint ->> 'stage' = 'rendered'
    AND company_id IS NOT NULL
    AND source_hash ~ '^sha256:[0-9a-fA-F]{64}$'
    AND source_path ~* '\.(xlsx|xls|xlsm|csv|tsv|ods|pdf|docx|doc|rtf|json|jsonl|txt|md|markdown|jpg|jpeg|png|webp|tiff|bmp)$'
    AND source_path !~* '^canonical-import:'
    AND source_path !~* '^(customer|product|invoice)-'
    AND job_key ~ '^canonical-import:generic:'
    AND (evidence -> 'renderedOutput' ->> 'importId') ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,35}$';
