-- Pin search_path on the canonical import terminal RPC.
ALTER FUNCTION public.import_finish_job(uuid,text,jsonb,text) SET search_path=public;
