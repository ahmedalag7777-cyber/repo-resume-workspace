-- Forward-only correction for composite provenance foreign keys.
-- Keep tenant identity immutable when a folder/file source is deleted; only the
-- nullable source identifier may be cleared.
ALTER TABLE public.canonical_text_provenance
  DROP CONSTRAINT IF EXISTS canonical_text_provenance_company_id_folder_id_fkey,
  DROP CONSTRAINT IF EXISTS canonical_text_provenance_company_id_file_id_fkey;

ALTER TABLE public.canonical_text_provenance
  ADD CONSTRAINT canonical_text_provenance_company_id_folder_id_fkey
    FOREIGN KEY (company_id, folder_id)
    REFERENCES public.watched_report_folders(company_id, id)
    ON DELETE SET NULL (folder_id),
  ADD CONSTRAINT canonical_text_provenance_company_id_file_id_fkey
    FOREIGN KEY (company_id, file_id)
    REFERENCES public.watched_report_files(company_id, id)
    ON DELETE SET NULL (file_id);
