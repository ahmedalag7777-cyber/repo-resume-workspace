revoke all on function public.enqueue_report_execution_job(uuid,text,text,text,text[],integer,boolean) from public, authenticated, anon;
grant execute on function public.enqueue_report_execution_job(uuid,text,text,text,text[],integer,boolean) to service_role;

revoke all on function public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean) from public, authenticated, anon;
grant execute on function public.import_commit_batch(uuid,text,jsonb,text,text,uuid,boolean) to service_role;
