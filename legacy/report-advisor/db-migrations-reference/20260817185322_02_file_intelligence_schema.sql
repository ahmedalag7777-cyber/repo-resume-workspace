/*
# File Intelligence Platform Schema Extension

Extends the existing imports system with file_records, synonym_dictionary,
import_profiles, import_snapshots, import_jobs, import_job_rows, data_quality_reports.

1. New Tables
- file_records: uploaded file metadata with SHA-256 fingerprint, magic bytes, security scan
- synonym_dictionary: central synonym mapping (Arabic/English column name to canonical field)
- import_profiles: reusable import templates with required/optional fields and matching keys
- import_snapshots: pre-import state snapshots for rollback
- import_jobs: job lifecycle tracking (queued/processing/paused/completed/partial/failed/cancelled)
- import_job_rows: per-row import results with lineage
- data_quality_reports: quality analysis results per file/dataset

2. Modified Tables
- imports: added file_hash, file_fingerprint_id, processing_mode, profile_id columns

3. Security
- RLS enabled on all new tables with anon+authenticated full CRUD (single-tenant)
*/

-- ============ FILE RECORDS ============
CREATE TABLE IF NOT EXISTS file_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_extension text,
  file_mime text,
  file_size bigint DEFAULT 0,
  file_hash text,
  magic_bytes text,
  detected_format text,
  detected_encoding text,
  security_status text DEFAULT 'pending',
  security_issues jsonb,
  is_duplicate boolean DEFAULT false,
  duplicate_of uuid REFERENCES file_records(id),
  status text DEFAULT 'uploaded',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ SYNONYM DICTIONARY ============
CREATE TABLE IF NOT EXISTS synonym_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_field text NOT NULL,
  synonym text NOT NULL,
  language text DEFAULT 'ar',
  confidence numeric(5,2) DEFAULT 100.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_synonym_unique ON synonym_dictionary(canonical_field, synonym);

-- ============ IMPORT PROFILES ============
CREATE TABLE IF NOT EXISTS import_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  entity_type text NOT NULL,
  target_table text NOT NULL,
  required_fields jsonb DEFAULT '[]'::jsonb,
  optional_fields jsonb DEFAULT '[]'::jsonb,
  matching_keys jsonb DEFAULT '[]'::jsonb,
  field_mappings jsonb DEFAULT '{}'::jsonb,
  conflict_resolution text DEFAULT 'skip',
  null_policy text DEFAULT 'reject',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============ IMPORT SNAPSHOTS ============
CREATE TABLE IF NOT EXISTS import_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id uuid,
  table_name text NOT NULL,
  row_count int DEFAULT 0,
  snapshot_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ IMPORT JOBS ============
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_record_id uuid REFERENCES file_records(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES import_profiles(id) ON DELETE SET NULL,
  job_type text DEFAULT 'import',
  status text NOT NULL DEFAULT 'queued',
  processing_mode text DEFAULT 'import',
  total_rows int DEFAULT 0,
  processed_rows int DEFAULT 0,
  valid_rows int DEFAULT 0,
  invalid_rows int DEFAULT 0,
  quarantined_rows int DEFAULT 0,
  duplicate_rows int DEFAULT 0,
  progress int DEFAULT 0,
  speed_rows_per_sec int DEFAULT 0,
  eta_seconds int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms bigint DEFAULT 0,
  error_message text,
  result_summary jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ IMPORT JOB ROWS ============
CREATE TABLE IF NOT EXISTS import_job_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number int NOT NULL,
  status text NOT NULL DEFAULT 'valid',
  source_data jsonb,
  mapped_data jsonb,
  target_table text,
  target_id uuid,
  error_message text,
  error_type text,
  lineage jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ DATA QUALITY REPORTS ============
CREATE TABLE IF NOT EXISTS data_quality_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_record_id uuid REFERENCES file_records(id) ON DELETE SET NULL,
  job_id uuid REFERENCES import_jobs(id) ON DELETE SET NULL,
  total_rows int DEFAULT 0,
  total_columns int DEFAULT 0,
  completeness_score numeric(5,2) DEFAULT 0,
  validity_score numeric(5,2) DEFAULT 0,
  uniqueness_score numeric(5,2) DEFAULT 0,
  consistency_score numeric(5,2) DEFAULT 0,
  overall_score numeric(5,2) DEFAULT 0,
  missing_values jsonb,
  duplicates jsonb,
  anomalies jsonb,
  statistics jsonb,
  column_profiles jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ ADD COLUMNS TO IMPORTS ============
ALTER TABLE imports ADD COLUMN IF NOT EXISTS file_hash text;
ALTER TABLE imports ADD COLUMN IF NOT EXISTS file_fingerprint_id uuid REFERENCES file_records(id) ON DELETE SET NULL;
ALTER TABLE imports ADD COLUMN IF NOT EXISTS processing_mode text DEFAULT 'import';
ALTER TABLE imports ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES import_profiles(id) ON DELETE SET NULL;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_file_records_hash ON file_records(file_hash);
CREATE INDEX IF NOT EXISTS idx_file_records_company ON file_records(company_id);
CREATE INDEX IF NOT EXISTS idx_synonym_canonical ON synonym_dictionary(canonical_field);
CREATE INDEX IF NOT EXISTS idx_synonym_synonym ON synonym_dictionary(synonym);
CREATE INDEX IF NOT EXISTS idx_import_jobs_company_status ON import_jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_import_job_rows_job ON import_job_rows(job_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_file ON data_quality_reports(file_record_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_company ON import_snapshots(company_id);

-- ============ RLS ============
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'file_records','synonym_dictionary','import_profiles','import_snapshots',
    'import_jobs','import_job_rows','data_quality_reports'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_select_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true)', 'anon_select_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_insert_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', 'anon_insert_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_update_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', 'anon_update_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_delete_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true)', 'anon_delete_'||t, t);
  END LOOP;
END $$;
