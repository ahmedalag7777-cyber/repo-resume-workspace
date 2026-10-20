-- Phase J / import continuity: watched folders, incremental file ledger and canonical-text provenance.
CREATE TABLE IF NOT EXISTS watched_report_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  logical_path text,
  enabled boolean NOT NULL DEFAULT true,
  recursive boolean NOT NULL DEFAULT true,
  poll_interval_ms integer NOT NULL DEFAULT 30000 CHECK (poll_interval_ms >= 1000),
  auto_process boolean NOT NULL DEFAULT true,
  process_only_changed_rows boolean NOT NULL DEFAULT true,
  max_concurrent_files integer NOT NULL DEFAULT 2 CHECK (max_concurrent_files BETWEEN 1 AND 8),
  retry_limit integer NOT NULL DEFAULT 3 CHECK (retry_limit BETWEEN 1 AND 10),
  accepted_extensions text[] NOT NULL DEFAULT ARRAY['.pdf','.xlsx','.xls','.csv','.docx','.doc','.txt'],
  last_scan_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,label)
);
CREATE INDEX IF NOT EXISTS idx_watched_report_folders_company ON watched_report_folders(company_id, enabled);

CREATE TABLE IF NOT EXISTS watched_report_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES watched_report_folders(id) ON DELETE CASCADE,
  relative_path text NOT NULL,
  content_hash text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  modified_at timestamptz,
  state text NOT NULL CHECK (state IN ('new','changed','unchanged','processing','processed','failed','dead_letter','deleted')),
  last_processed_at timestamptz,
  last_successful_checkpoint text,
  last_error text,
  source_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,folder_id,relative_path)
);
CREATE INDEX IF NOT EXISTS idx_watched_report_files_pending ON watched_report_files(company_id,folder_id,state,updated_at DESC);

CREATE TABLE IF NOT EXISTS canonical_text_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES watched_report_folders(id) ON DELETE SET NULL,
  file_id uuid REFERENCES watched_report_files(id) ON DELETE SET NULL,
  source_hash text NOT NULL,
  text_hash text,
  source_type text NOT NULL,
  extraction_status text NOT NULL CHECK (extraction_status IN ('not_started','succeeded','failed','partial')),
  analysis_input_mode text NOT NULL CHECK (analysis_input_mode IN ('canonical_text','structured_source_fallback')),
  text_storage_path text,
  extracted_at timestamptz NOT NULL DEFAULT now(),
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(company_id,source_hash)
);
CREATE INDEX IF NOT EXISTS idx_canonical_text_provenance_source ON canonical_text_provenance(company_id,source_type,extracted_at DESC);

ALTER TABLE watched_report_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched_report_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_text_provenance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE watched_report_folders, watched_report_files, canonical_text_provenance FROM anon;
CREATE POLICY watched_report_folders_tenant ON watched_report_folders FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY watched_report_files_tenant ON watched_report_files FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());
CREATE POLICY canonical_text_provenance_tenant ON canonical_text_provenance FOR ALL TO authenticated USING (company_id=public.current_company_id()) WITH CHECK (company_id=public.current_company_id());

CREATE OR REPLACE FUNCTION public.record_watched_report_file(
  p_folder_id uuid,p_relative_path text,p_content_hash text,p_size_bytes bigint,p_modified_at timestamptz,p_state text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO watched_report_files(company_id,folder_id,relative_path,content_hash,size_bytes,modified_at,state)
  SELECT public.current_company_id(),p_folder_id,p_relative_path,p_content_hash,p_size_bytes,p_modified_at,p_state
  ON CONFLICT(company_id,folder_id,relative_path) DO UPDATE SET
    content_hash=EXCLUDED.content_hash,size_bytes=EXCLUDED.size_bytes,modified_at=EXCLUDED.modified_at,
    state=EXCLUDED.state,source_version=watched_report_files.source_version+1,updated_at=now();
  SELECT id INTO v_id FROM watched_report_files WHERE company_id=public.current_company_id() AND folder_id=p_folder_id AND relative_path=p_relative_path;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_watched_report_file(uuid,text,text,bigint,timestamptz,text) TO authenticated;
