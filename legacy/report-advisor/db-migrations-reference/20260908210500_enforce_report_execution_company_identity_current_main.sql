-- Forward-only follow-up: every durable report job must have a tenant identity.
-- Existing rows are rejected rather than guessed/backfilled because there is no
-- authoritative source from which a NULL company_id can be recovered safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.report_execution_jobs
    WHERE company_id IS NULL
  ) THEN
    RAISE EXCEPTION 'report_execution_jobs contains rows without company identity; refusing unsafe tenant backfill';
  END IF;
END
$$;

ALTER TABLE public.report_execution_jobs
  ALTER COLUMN company_id SET NOT NULL;
