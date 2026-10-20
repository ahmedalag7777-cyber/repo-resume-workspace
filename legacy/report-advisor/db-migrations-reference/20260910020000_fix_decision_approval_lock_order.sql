-- Preserve the decision approval lifecycle while enforcing the production lock order:
-- decision row lock -> decision state gate -> approval lookup/lock -> mutation.
-- The decision must be locked before any approval row is inspected so concurrent
-- approval requests serialize on the authoritative decision state.
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
  v_decision_status text;
  v_existing_status text;
begin
  if v_company is null or v_user is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  -- Lock the authoritative decision before reading/checking approval state.
  select d.status
    into v_decision_status
  from public.business_intelligence_decisions d
  where d.id = p_decision_id
    and d.company_id = v_company
  for update;

  if v_decision_status is distinct from 'PROPOSED' then
    raise exception 'DECISION_NOT_APPROVABLE';
  end if;

  select a.status
    into v_existing_status
  from public.decision_approvals a
  where a.company_id = v_company
    and a.decision_id = p_decision_id
  for update;

  if v_existing_status in ('APPROVED','REJECTED','CANCELLED') then
    raise exception 'APPROVAL_TERMINAL_NOT_REOPENABLE';
  end if;

  insert into public.decision_approvals(company_id, decision_id, status, requested_by, reason)
  values (v_company, p_decision_id, 'PENDING', v_user, p_reason)
  on conflict (company_id, decision_id) do update
    set status = 'PENDING',
        requested_by = excluded.requested_by,
        reason = excluded.reason,
        requested_at = now(),
        decided_at = null,
        decided_by = null
    where public.decision_approvals.status not in ('APPROVED','REJECTED','CANCELLED')
  returning id into v_id;

  if v_id is null then
    raise exception 'APPROVAL_TERMINAL_NOT_REOPENABLE';
  end if;

  return v_id;
end;
$function$;
