-- Remove PostgREST overload ambiguity for normal commits while preserving repair isolation.
-- The privileged repair implementation keeps its existing body and OID; only its RPC
-- name changes. Normal six-argument commits continue through import_commit_batch.
DO $rename_repair_rpc$
BEGIN
  IF to_regprocedure('public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean)') IS NOT NULL THEN
    IF to_regprocedure('public.import_repair_commit_batch(uuid,text,jsonb,text,text,uuid,boolean)') IS NOT NULL THEN
      RAISE EXCEPTION 'Both old and isolated repair RPCs exist; refusing ambiguous rename';
    END IF;
    EXECUTE 'ALTER FUNCTION public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean) RENAME TO import_repair_commit_batch';
  ELSIF to_regprocedure('public.import_repair_commit_batch(uuid,text,jsonb,text,text,uuid,boolean)') IS NULL THEN
    RAISE EXCEPTION 'Neither existing nor isolated repair RPC is present';
  END IF;
END
$rename_repair_rpc$;

REVOKE ALL ON FUNCTION public.import_repair_commit_batch(uuid,text,jsonb,text,text,uuid,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_repair_commit_batch(uuid,text,jsonb,text,text,uuid,boolean)
  TO service_role;

-- Ensure the API schema cache no longer exposes the renamed repair overload.
NOTIFY pgrst, 'reload schema';
