BEGIN;

CREATE TABLE IF NOT EXISTS public.canonical_dataset_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  import_job_id uuid NULL REFERENCES public.import_jobs(id) ON DELETE SET NULL,
  source_hash text NOT NULL,
  semantic_domain text NOT NULL,
  row_number integer NOT NULL CHECK (row_number > 0),
  record_key text NOT NULL,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  provenance jsonb NOT NULL CHECK (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_dataset_records_domain_check CHECK (length(btrim(semantic_domain)) BETWEEN 1 AND 128),
  CONSTRAINT canonical_dataset_records_key_check CHECK (length(btrim(record_key)) BETWEEN 1 AND 512),
  CONSTRAINT canonical_dataset_records_source_hash_check CHECK (source_hash ~ '^sha256:[0-9a-fA-F]{64}$'),
  CONSTRAINT canonical_dataset_records_unique_source_row UNIQUE (company_id, source_hash, row_number)
);

CREATE INDEX IF NOT EXISTS canonical_dataset_records_company_domain_idx
  ON public.canonical_dataset_records(company_id, semantic_domain);

CREATE INDEX IF NOT EXISTS canonical_dataset_records_company_source_idx
  ON public.canonical_dataset_records(company_id, source_hash);

CREATE INDEX IF NOT EXISTS canonical_dataset_records_import_job_idx
  ON public.canonical_dataset_records(import_job_id);

ALTER TABLE public.canonical_dataset_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_dataset_records_select_tenant ON public.canonical_dataset_records;
CREATE POLICY canonical_dataset_records_select_tenant
  ON public.canonical_dataset_records
  FOR SELECT
  TO authenticated
  USING (company_id = public.current_company_id());

REVOKE ALL ON TABLE public.canonical_dataset_records FROM anon;
REVOKE ALL ON TABLE public.canonical_dataset_records FROM authenticated;
GRANT SELECT ON TABLE public.canonical_dataset_records TO authenticated;

ALTER TABLE public.canonical_import_commits
  DROP CONSTRAINT IF EXISTS canonical_import_commits_entity_type_check;

ALTER TABLE public.canonical_import_commits
  ADD CONSTRAINT canonical_import_commits_entity_type_check
  CHECK (
    entity_type IN ('products','customers','sales_invoices')
    OR entity_type ~ '^generic:[a-z][a-z0-9_-]{0,63}$'
  );

COMMIT;
