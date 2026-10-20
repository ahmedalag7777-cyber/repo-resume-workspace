begin;

-- SECURITY DEFINER functions are public-execute by default unless explicitly revoked.
-- Keep the billing RPC surface authenticated-only even when the migration is replayed.
revoke all on function public.billing_current_subscription() from public;
revoke all on function public.billing_current_subscription() from anon;
revoke all on function public.billing_check_entitlement(text,numeric) from public;
revoke all on function public.billing_check_entitlement(text,numeric) from anon;
revoke all on function public.billing_record_usage(text,numeric,text,text,jsonb) from public;
revoke all on function public.billing_record_usage(text,numeric,text,text,jsonb) from anon;
revoke all on function public.billing_set_subscription(uuid,text,timestamptz,timestamptz,timestamptz,timestamptz,boolean) from public;
revoke all on function public.billing_set_subscription(uuid,text,timestamptz,timestamptz,timestamptz,timestamptz,boolean) from anon;

grant execute on function public.billing_current_subscription() to authenticated;
grant execute on function public.billing_check_entitlement(text,numeric) to authenticated;
grant execute on function public.billing_record_usage(text,numeric,text,text,jsonb) to authenticated;
grant execute on function public.billing_set_subscription(uuid,text,timestamptz,timestamptz,timestamptz,timestamptz,boolean) to authenticated;

commit;
