-- Restore the causal-hypothesis relation in clean/local databases so a data-only backup
-- from the governed source schema can be restored without omitting any table from the dump.
CREATE TABLE IF NOT EXISTS public.intelligence_causal_hypotheses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  report_execution_job_id uuid NULL,
  source_hash text NOT NULL,
  claim_key text NOT NULL,
  state text NOT NULL,
  evidence_supporting jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_contradicting jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  alternative_explanations jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric NULL,
  unresolved_cause boolean NOT NULL DEFAULT true,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT intelligence_causal_hypotheses_pkey PRIMARY KEY (id),
  CONSTRAINT intelligence_causal_hypotheses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT intelligence_causal_hypotheses_report_execution_job_id_fkey FOREIGN KEY (report_execution_job_id) REFERENCES public.report_execution_jobs(id) ON DELETE SET NULL,
  CONSTRAINT intelligence_causal_hypotheses_confidence_check CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT intelligence_causal_hypotheses_state_check CHECK (state = ANY (ARRAY['CORRELATION'::text, 'EXPLANATION'::text, 'CAUSAL_HYPOTHESIS'::text, 'CAUSALITY_PROVEN'::text, 'REVIEW_REQUIRED'::text, 'UNRESOLVED'::text])),
  CONSTRAINT intelligence_causal_hypothese_company_id_source_hash_claim__key UNIQUE (company_id, source_hash, claim_key)
);

CREATE INDEX IF NOT EXISTS idx_causal_hypotheses_job
  ON public.intelligence_causal_hypotheses USING btree (company_id, report_execution_job_id, created_at DESC);

ALTER TABLE public.intelligence_causal_hypotheses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.intelligence_causal_hypotheses FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.intelligence_causal_hypotheses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.intelligence_causal_hypotheses TO service_role;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'intelligence_causal_hypotheses'
      AND policyname = 'causal_hypotheses_tenant'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY causal_hypotheses_tenant
      ON public.intelligence_causal_hypotheses
      FOR ALL TO authenticated
      USING (company_id = public.current_company_id())
      WITH CHECK (company_id = public.current_company_id())
    $policy$;
  END IF;
END;
$migration$;
