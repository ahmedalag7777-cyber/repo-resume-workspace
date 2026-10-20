-- Reject path traversal and absolute paths at the canonical watched-report write boundary.
-- The application already supplies relative paths; the RPC must remain safe when called directly.
CREATE OR REPLACE FUNCTION public.record_watched_report_file(
  p_folder_id uuid, p_relative_path text, p_content_hash text,
  p_size_bytes bigint, p_modified_at timestamptz, p_state text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_company uuid := public.current_company_id(); v_id uuid;
BEGIN
  IF v_company IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED'; END IF;
  IF p_folder_id IS NULL OR p_relative_path IS NULL OR btrim(p_relative_path) = ''
     OR p_content_hash IS NULL OR btrim(p_content_hash) = '' THEN RAISE EXCEPTION 'WATCHED_FILE_IDENTITY_REQUIRED'; END IF;
  IF p_relative_path ~ '(^|[\\/])\.\.([\\/]|$)'
     OR p_relative_path ~ '^[A-Za-z]:'
     OR left(p_relative_path, 1) IN ('/', E'\\') THEN
    RAISE EXCEPTION 'WATCHED_FILE_PATH_INVALID';
  END IF;
  IF p_size_bytes IS NULL OR p_size_bytes < 0 THEN RAISE EXCEPTION 'WATCHED_FILE_SIZE_INVALID'; END IF;
  IF p_state NOT IN ('new','changed','unchanged','processing','processed','failed','dead_letter','deleted') THEN
    RAISE EXCEPTION 'WATCHED_FILE_STATE_INVALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.watched_report_folders f WHERE f.id=p_folder_id AND f.company_id=v_company) THEN
    RAISE EXCEPTION 'FOLDER_NOT_FOUND_OR_FORBIDDEN';
  END IF;
  INSERT INTO public.watched_report_files(company_id,folder_id,relative_path,content_hash,size_bytes,modified_at,state)
  VALUES(v_company,p_folder_id,p_relative_path,p_content_hash,p_size_bytes,p_modified_at,p_state)
  ON CONFLICT(company_id,folder_id,relative_path) DO UPDATE
    SET content_hash=EXCLUDED.content_hash,size_bytes=EXCLUDED.size_bytes,modified_at=EXCLUDED.modified_at,
        state=EXCLUDED.state,source_version=public.watched_report_files.source_version+1,updated_at=now();
  SELECT id INTO v_id FROM public.watched_report_files
  WHERE company_id=v_company AND folder_id=p_folder_id AND relative_path=p_relative_path;
  RETURN v_id;
END;
$function$;

