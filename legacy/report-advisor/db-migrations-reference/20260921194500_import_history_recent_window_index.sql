-- Optimize the canonical bounded import-history read:
-- company-scoped newest rows, deterministic id tie-breaker.
CREATE INDEX IF NOT EXISTS idx_import_jobs_company_created_id
  ON public.import_jobs (company_id, created_at DESC, id ASC);
