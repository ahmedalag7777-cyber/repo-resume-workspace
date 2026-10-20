-- Keep the value-of-information request queue in versioned schema history.
-- The live staging database has this table, but the originating historical migration
-- is absent from the repository; clean restores therefore fail when replaying data.
CREATE TABLE IF NOT EXISTS public.intelligence_voi_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  report_execution_job_id uuid NULL,
  source_hash text NOT NULL,
  question text NOT NULL,
  decision_key text NOT NULL,
  sensitivity numeric NOT NULL,
  estimated_value numeric NOT NULL,
  priority_score numeric NOT NULL,
  minimum_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  state text NOT NULL DEFAULT 'OPEN'::text,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT intelligence_voi_requests_pkey PRIMARY KEY (id),
  CONSTRAINT intelligence_voi_requests_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT intelligence_voi_requests_report_execution_job_id_fkey
    FOREIGN KEY (report_execution_job_id) REFERENCES public.report_execution_jobs(id) ON DELETE SET NULL,
  CONSTRAINT intelligence_voi_requests_sensitivity_check CHECK (sensitivity >= 0),
  CONSTRAINT intelligence_voi_requests_estimated_value_check CHECK (estimated_value >= 0),
  CONSTRAINT intelligence_voi_requests_priority_score_check CHECK (priority_score >= 0),
  CONSTRAINT intelligence_voi_requests_state_check
    CHECK (state = ANY (ARRAY['OPEN'::text, 'COLLECTING'::text, 'SUFFICIENT'::text, 'DEFERRED'::text, 'BLOCKED'::text]))
);

CREATE INDEX IF NOT EXISTS idx_voi_requests_priority
  ON public.intelligence_voi_requests USING btree
  (company_id, state, priority_score DESC, created_at DESC);

ALTER TABLE public.intelligence_voi_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.intelligence_voi_requests FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.intelligence_voi_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.intelligence_voi_requests TO service_role;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'intelligence_voi_requests'
      AND policyname = 'voi_requests_tenant'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY voi_requests_tenant
      ON public.intelligence_voi_requests
      FOR ALL TO authenticated
      USING (company_id = public.current_company_id())
      WITH CHECK (company_id = public.current_company_id())
    $policy$;
  END IF;
END;
$migration$;
