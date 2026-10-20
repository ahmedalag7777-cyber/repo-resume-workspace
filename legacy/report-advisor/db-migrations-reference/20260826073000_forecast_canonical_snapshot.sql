-- Canonical forecast display snapshot. Tenant authority is derived from current_company_id().
create or replace function public.get_forecast_snapshot(
  p_limit integer default 500
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 500));
  v_result jsonb;
begin
  if v_company_id is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  select jsonb_build_object(
    'rows', coalesce(jsonb_agg(to_jsonb(f) order by f.period asc, f.id asc), '[]'::jsonb),
    'limit', v_limit,
    'data_status', case when count(*) = 0 then 'NO_DATA' else 'CALCULATED' end
  ) into v_result
  from (
    select id, company_id, entity_type, entity_id, entity_name, metric,
           period, forecast_value, lower_bound, upper_bound, model_name,
           quality_score, confidence, data_points
    from public.forecasts
    where company_id = v_company_id
    order by period asc, id asc
    limit v_limit
  ) f;

  return v_result;
end;
$$;

revoke all on function public.get_forecast_snapshot(integer) from public;
revoke all on function public.get_forecast_snapshot(integer) from anon;
grant execute on function public.get_forecast_snapshot(integer) to authenticated;
