-- Repair the canonical tenant resolver without rewriting the already-applied historical migration.
-- Root cause reproduced by exact Storage Tenant Runtime E2E on current Phase-F candidate:
-- PostgreSQL has no min(uuid), so current_company_id() must not aggregate UUIDs.
-- The existing partial unique index already guarantees at most one active default membership per user.

create or replace function public.current_company_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_company_id uuid;
  v_count integer;
begin
  select count(*)
    into v_count
  from public.company_memberships cm
  where cm.user_id = auth.uid()
    and cm.is_active = true
    and cm.is_default = true;

  if v_count <> 1 then
    return null;
  end if;

  select cm.company_id
    into v_company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid()
    and cm.is_active = true
    and cm.is_default = true
  limit 1;

  return v_company_id;
end;
$function$;

revoke all on function public.current_company_id() from public;
grant execute on function public.current_company_id() to authenticated, service_role;

comment on function public.current_company_id() is
  'Tenant resolver: exactly one active default membership returns its company_id; ambiguity or absence returns null.';
