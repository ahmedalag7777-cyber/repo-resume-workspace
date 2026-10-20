-- Restore persisted metric calculations before a data-only logical backup is imported.
-- The governed staging schema has this table, but it was absent from the checked-in
-- migration set; the restore therefore failed before importing its 77 source-bound rows.
CREATE TABLE IF NOT EXISTS public.report_intelligence_calculations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  report_execution_job_id uuid NOT NULL,
  source_hash text NOT NULL,
  evidence_snapshot_id uuid NULL,
  evidence_passport_id uuid NULL,
  archetype_id text NOT NULL,
  profile_version integer NOT NULL,
  metric_id text NOT NULL,
  name text NOT NULL,
  formula text NOT NULL,
  availability_state text NOT NULL,
  value numeric NULL,
  unit text NULL,
  sample_size integer NOT NULL DEFAULT 0,
  usable_sample integer NOT NULL DEFAULT 0,
  source_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  limitation text NOT NULL DEFAULT ''::text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT report_intelligence_calculations_pkey PRIMARY KEY (id),
  CONSTRAINT report_intelligence_calculations_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT report_intelligence_calculations_report_execution_job_id_fkey
    FOREIGN KEY (report_execution_job_id) REFERENCES public.report_execution_jobs(id) ON DELETE CASCADE,
  CONSTRAINT report_intelligence_calculations_evidence_snapshot_id_fkey
    FOREIGN KEY (evidence_snapshot_id) REFERENCES public.report_evidence_snapshots(id) ON DELETE SET NULL,
  CONSTRAINT report_intelligence_calculations_evidence_passport_id_fkey
    FOREIGN KEY (evidence_passport_id) REFERENCES public.report_evidence_passports(id) ON DELETE SET NULL,
  CONSTRAINT report_intelligence_calculations_availability_state_check
    CHECK (availability_state = ANY (ARRAY['CALCULATED'::text, 'NOT_AVAILABLE'::text, 'INSUFFICIENT_SAMPLE'::text, 'REVIEW_REQUIRED'::text])),
  CONSTRAINT report_intelligence_calculations_check
    CHECK (usable_sample >= 0 AND usable_sample <= sample_size),
  CONSTRAINT report_intelligence_calculations_confidence_check
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT report_intelligence_calculations_sample_size_check
    CHECK (sample_size >= 0),
  CONSTRAINT report_intelligence_calculations_unique_lineage
    UNIQUE (company_id, report_execution_job_id, source_hash, archetype_id, profile_version, metric_id)
);

CREATE INDEX IF NOT EXISTS report_intelligence_calculations_job_idx
  ON public.report_intelligence_calculations USING btree (company_id, report_execution_job_id, source_hash);
CREATE INDEX IF NOT EXISTS report_intelligence_calculations_metric_idx
  ON public.report_intelligence_calculations USING btree (company_id, archetype_id, metric_id);

ALTER TABLE public.report_intelligence_calculations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.report_intelligence_calculations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.report_intelligence_calculations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE ON TABLE public.report_intelligence_calculations TO service_role;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_intelligence_calculations'
      AND policyname = 'report_intelligence_calculations_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY report_intelligence_calculations_select
      ON public.report_intelligence_calculations
      FOR SELECT TO authenticated
      USING (company_id = public.current_company_id())
    $policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_intelligence_calculations'
      AND policyname = 'report_intelligence_calculations_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY report_intelligence_calculations_insert
      ON public.report_intelligence_calculations
      FOR INSERT TO authenticated
      WITH CHECK (company_id = public.current_company_id())
    $policy$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_intelligence_calculations'
      AND policyname = 'report_intelligence_calculations_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY report_intelligence_calculations_update
      ON public.report_intelligence_calculations
      FOR UPDATE TO authenticated
      USING (company_id = public.current_company_id())
      WITH CHECK (company_id = public.current_company_id())
    $policy$;
  END IF;
END;
$migration$;
