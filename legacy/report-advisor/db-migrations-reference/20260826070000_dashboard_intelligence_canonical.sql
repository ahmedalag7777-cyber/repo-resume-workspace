-- Canonical tenant-authoritative read for dashboard recommendations and alerts.
-- No client-selected company id is accepted; tenant identity comes from current_company_id().
create or replace function public.get_dashboard_intelligence(
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
  v_result jsonb;
begin
  if v_company_id is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  select jsonb_build_object(
    'recommendations', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from (
        select id, company_id, category, priority, title, description,
               expected_impact, confidence, status, owner, deadline,
               impact_result, created_at
        from public.recommendations
        where company_id = v_company_id
        order by created_at desc
        limit v_limit
      ) r
    ), '[]'::jsonb),
    'alerts', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from (
        select id, company_id, severity, category, title, description,
               metric_value, threshold, is_read, created_at
        from public.alerts
        where company_id = v_company_id
        order by created_at desc
        limit v_limit
      ) a
    ), '[]'::jsonb),
    'limit', v_limit
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_dashboard_intelligence(integer) from public;
revoke all on function public.get_dashboard_intelligence(integer) from anon;
grant execute on function public.get_dashboard_intelligence(integer) to authenticated;
