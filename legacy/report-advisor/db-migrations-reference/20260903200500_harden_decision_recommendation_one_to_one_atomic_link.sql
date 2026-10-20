-- Enforce the canonical one-to-one Decision <-> Recommendation link.
-- The two nullable foreign keys are singular on both sides, and the runtime
-- contract links both directions atomically. Prevent duplicate ownership and
-- reject overwrite/reassignment races at both DB and RPC layers.

create unique index if not exists recommendations_company_decision_unique_idx
  on public.recommendations(company_id, decision_id)
  where decision_id is not null;

create unique index if not exists decisions_company_recommendation_unique_idx
  on public.business_intelligence_decisions(company_id, recommendation_id)
  where recommendation_id is not null;

create or replace function public.link_recommendation_to_decision(
  p_recommendation_id uuid,
  p_decision_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_company_id uuid;
  v_recommendation_decision uuid;
  v_decision_recommendation uuid;
begin
  v_company_id := public.current_company_id();
  if v_company_id is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  -- Lock in deterministic order to serialize conflicting link attempts.
  select decision_id
    into v_recommendation_decision
    from public.recommendations
   where id = p_recommendation_id
     and company_id = v_company_id
   for update;

  if not found then
    raise exception 'RECOMMENDATION_NOT_FOUND_OR_FORBIDDEN';
  end if;

  select recommendation_id
    into v_decision_recommendation
    from public.business_intelligence_decisions
   where id = p_decision_id
     and company_id = v_company_id
   for update;

  if not found then
    raise exception 'DECISION_NOT_FOUND_OR_FORBIDDEN';
  end if;

  if v_recommendation_decision is not null
     and v_recommendation_decision <> p_decision_id then
    raise exception 'RECOMMENDATION_ALREADY_LINKED';
  end if;

  if v_decision_recommendation is not null
     and v_decision_recommendation <> p_recommendation_id then
    raise exception 'DECISION_ALREADY_LINKED';
  end if;

  update public.recommendations
     set decision_id = p_decision_id
   where id = p_recommendation_id
     and company_id = v_company_id;

  update public.business_intelligence_decisions
     set recommendation_id = p_recommendation_id
   where id = p_decision_id
     and company_id = v_company_id;
end;
$$;
