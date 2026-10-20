-- Enforce approval separation of duties in the canonical RPC, not only in UI.
create or replace function public.decide_approval(
  p_approval_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_company uuid := public.current_company_id();
  v_user uuid := auth.uid();
  v_decision uuid;
  v_decision_status text;
  v_status text;
  v_requested_by uuid;
begin
  if v_company is null or v_user is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  select decision_id
    into v_decision
  from public.decision_approvals
  where id = p_approval_id
    and company_id = v_company;

  if v_decision is null then
    raise exception 'APPROVAL_NOT_FOUND';
  end if;

  select status
    into v_decision_status
  from public.business_intelligence_decisions
  where id = v_decision
    and company_id = v_company
  for update;

  if v_decision_status is distinct from 'PROPOSED' then
    raise exception 'DECISION_STATE_CHANGED';
  end if;

  select status, requested_by
    into v_status, v_requested_by
  from public.decision_approvals
  where id = p_approval_id
    and company_id = v_company
  for update;

  if v_status <> 'PENDING' then
    raise exception 'APPROVAL_NOT_PENDING';
  end if;

  if p_approve and v_requested_by = v_user then
    raise exception 'SELF_APPROVAL_FORBIDDEN';
  end if;

  update public.decision_approvals
  set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
      decided_at = now(),
      decided_by = v_user,
      reason = p_reason
  where id = p_approval_id
    and company_id = v_company;

  update public.business_intelligence_decisions
  set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
      approved_at = case when p_approve then now() else null end,
      approved_by = case when p_approve then v_user else null end,
      rejection_reason = case when p_approve then null else p_reason end
  where id = v_decision
    and company_id = v_company;

  if not found then
    raise exception 'DECISION_STATE_CHANGED';
  end if;

  return true;
end;
$$;

revoke all on function public.decide_approval(uuid, boolean, text) from public, anon;
grant execute on function public.decide_approval(uuid, boolean, text) to authenticated;
