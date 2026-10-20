REVOKE ALL ON FUNCTION public.normalize_import_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_import_key(text) TO authenticated;
