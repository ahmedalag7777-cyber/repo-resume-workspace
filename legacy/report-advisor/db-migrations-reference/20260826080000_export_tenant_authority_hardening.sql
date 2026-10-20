-- Harden canonical export RPC boundaries without changing export semantics.
-- Client company ids remain compatibility assertions, never tenant authority.

create or replace function public.get_inventory_export_rows(p_company_id uuid, p_max_rows integer default 10000)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_limit integer := greatest(1, least(coalesce(p_max_rows, 10000), 10000));
  v_result jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  if exists (select 1 from public.inventory_balances ib where ib.company_id=v_company_id offset v_limit limit 1) then
    raise exception 'EXPORT_TOO_LARGE: inventory export exceeds safe row limit';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'product',pr.name,
    'warehouse',w.name,
    'quantity',ib.quantity,
    'unit_cost',ib.unit_cost,
    'value',case when ib.quantity is null or ib.unit_cost is null then null else ib.quantity*ib.unit_cost end
  ) order by pr.name), '[]'::jsonb) into v_result
  from public.inventory_balances ib
  left join public.products pr on pr.id=ib.product_id and pr.company_id=v_company_id
  left join public.warehouses w on w.id=ib.warehouse_id and w.company_id=v_company_id
  where ib.company_id=v_company_id;
  return jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result));
end;
$$;

alter function public.get_sales_export_rows(uuid, integer) set search_path = public;
alter function public.get_purchase_export_rows(uuid, integer) set search_path = public;
alter function public.get_inventory_export_rows(uuid, integer) set search_path = public;
alter function public.get_receivables_export_rows(uuid, integer) set search_path = public;

revoke all on function public.get_sales_export_rows(uuid, integer) from anon;
revoke all on function public.get_purchase_export_rows(uuid, integer) from anon;
revoke all on function public.get_inventory_export_rows(uuid, integer) from anon;
revoke all on function public.get_receivables_export_rows(uuid, integer) from anon;

grant execute on function public.get_sales_export_rows(uuid, integer) to authenticated;
grant execute on function public.get_purchase_export_rows(uuid, integer) to authenticated;
grant execute on function public.get_inventory_export_rows(uuid, integer) to authenticated;
grant execute on function public.get_receivables_export_rows(uuid, integer) to authenticated;
