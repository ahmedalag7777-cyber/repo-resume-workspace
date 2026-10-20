-- Canonical purchase total and inventory valuation for report consumers.
-- Both functions use the trusted tenant context and fail closed on semantic ambiguity.
create or replace function public.get_purchase_summary(
  p_company_id uuid,
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_result jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  if p_from is not null and p_to is not null and p_from > p_to then raise exception 'REPORT_DATE_RANGE_INVALID'; end if;

  select jsonb_build_object(
    'total', coalesce(sum(pi.total), 0),
    'count', count(*)::integer,
    'supplier_count', count(distinct pi.supplier_id)::integer,
    'average', case when count(*) = 0 then null else sum(pi.total) / count(*) end,
    'as_of', coalesce(p_to, current_date),
    'data_status', case when count(*) = 0 then 'NO_DATA' else 'CALCULATED' end
  ) into v_result
  from public.purchase_invoices pi
  where pi.company_id = v_company_id
    and pi.status not in ('cancelled', 'void')
    and (p_from is null or pi.invoice_date >= p_from)
    and (p_to is null or pi.invoice_date <= p_to);

  return v_result;
end;
$$;

create or replace function public.get_inventory_valuation(p_company_id uuid)
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_result jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;

  select jsonb_build_object(
    'value', case when count(*) filter (where ib.quantity is null or ib.unit_cost is null) > 0 then null else coalesce(sum(ib.quantity * ib.unit_cost), 0) end,
    'row_count', count(*)::integer,
    'unknown_row_count', count(*) filter (where ib.quantity is null or ib.unit_cost is null)::integer,
    'data_status', case
      when count(*) = 0 then 'NO_DATA'
      when count(*) filter (where ib.quantity is null or ib.unit_cost is null) > 0 then 'INSUFFICIENT_DATA'
      else 'CALCULATED'
    end
  ) into v_result
  from public.inventory_balances ib
  where ib.company_id = v_company_id;

  return v_result;
end;
$$;

revoke all on function public.get_purchase_summary(uuid, date, date) from public;
grant execute on function public.get_purchase_summary(uuid, date, date) to authenticated;
revoke all on function public.get_inventory_valuation(uuid) from public;
grant execute on function public.get_inventory_valuation(uuid) to authenticated;
