-- Terminal approval states are not reopenable.
-- A CANCELLED approval must remain terminal even while its decision is still PROPOSED.
-- This preserves the approval lifecycle contract and prevents terminal resurrection.
create or replace function public.request_decision_approval(p_decision_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_company uuid := public.current_company_id();
  v_id uuid;
  v_user uuid := auth.uid();
  v_existing_status text;
begin
  if v_company is null or v_user is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if not exists (
    select 1 from public.business_intelligence_decisions d
    where d.id=p_decision_id and d.company_id=v_company and d.status='PROPOSED'
  ) then raise exception 'DECISION_NOT_APPROVABLE'; end if;

  select a.status into v_existing_status
  from public.decision_approvals a
  where a.company_id=v_company and a.decision_id=p_decision_id
  for update;

  if v_existing_status in ('APPROVED','REJECTED','CANCELLED') then
    raise exception 'APPROVAL_TERMINAL_NOT_REOPENABLE';
  end if;

  insert into public.decision_approvals(company_id,decision_id,status,requested_by,reason)
  values(v_company,p_decision_id,'PENDING',v_user,p_reason)
  on conflict(company_id,decision_id) do update
    set status='PENDING',requested_by=excluded.requested_by,reason=excluded.reason,requested_at=now(),decided_at=null,decided_by=null
  returning id into v_id;
  return v_id;
end;
$function$;
