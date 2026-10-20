-- Canonical export row sources. Exports use the same tenant/status semantics as report metrics.
-- A hard cap prevents an accidental unbounded browser export; callers receive an explicit truncation error.
create or replace function public.get_sales_export_rows(p_company_id uuid, p_max_rows integer default 10000)
returns jsonb language plpgsql stable security invoker as $$
declare v_company_id uuid := public.current_company_id(); v_limit integer := greatest(1, least(coalesce(p_max_rows, 10000), 10000)); v_result jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  if exists (select 1 from public.sales_invoices s where s.company_id=v_company_id and s.status not in ('cancelled','void') offset v_limit limit 1) then raise exception 'EXPORT_TOO_LARGE: sales export exceeds safe row limit'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('invoice_number',s.invoice_number,'customer',c.name,'invoice_date',s.invoice_date,'total',s.total,'paid_amount',s.paid_amount,'status',s.status) order by s.invoice_date desc), '[]'::jsonb) into v_result
  from public.sales_invoices s left join public.customers c on c.id=s.customer_id and c.company_id=v_company_id
  where s.company_id=v_company_id and s.status not in ('cancelled','void');
  return jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result));
end; $$;

create or replace function public.get_purchase_export_rows(p_company_id uuid, p_max_rows integer default 10000)
returns jsonb language plpgsql stable security invoker as $$
declare v_company_id uuid := public.current_company_id(); v_limit integer := greatest(1, least(coalesce(p_max_rows, 10000), 10000)); v_result jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  if exists (select 1 from public.purchase_invoices p where p.company_id=v_company_id and p.status not in ('cancelled','void') offset v_limit limit 1) then raise exception 'EXPORT_TOO_LARGE: purchase export exceeds safe row limit'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('invoice_number',p.invoice_number,'supplier',s.name,'invoice_date',p.invoice_date,'total',p.total,'paid_amount',p.paid_amount,'status',p.status) order by p.invoice_date desc), '[]'::jsonb) into v_result
  from public.purchase_invoices p left join public.suppliers s on s.id=p.supplier_id and s.company_id=v_company_id
  where p.company_id=v_company_id and p.status not in ('cancelled','void');
  return jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result));
end; $$;

create or replace function public.get_inventory_export_rows(p_company_id uuid, p_max_rows integer default 10000)
returns jsonb language plpgsql stable security invoker as $$
declare v_company_id uuid := public.current_company_id(); v_limit integer := greatest(1, least(coalesce(p_max_rows, 10000), 10000)); v_result jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if exists (select 1 from public.inventory_balances ib where ib.company_id=v_company_id offset v_limit limit 1) then raise exception 'EXPORT_TOO_LARGE: inventory export exceeds safe row limit'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('product',pr.name,'warehouse',w.name,'quantity',ib.quantity,'unit_cost',ib.unit_cost,'value',case when ib.quantity is null or ib.unit_cost is null then null else ib.quantity*ib.unit_cost end) order by pr.name), '[]'::jsonb) into v_result
  from public.inventory_balances ib left join public.products pr on pr.id=ib.product_id and pr.company_id=v_company_id left join public.warehouses w on w.id=ib.warehouse_id and w.company_id=v_company_id
  where ib.company_id=v_company_id;
  return jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result));
end; $$;

create or replace function public.get_receivables_export_rows(p_company_id uuid, p_max_rows integer default 10000)
returns jsonb language plpgsql stable security invoker as $$
declare v_company_id uuid := public.current_company_id(); v_limit integer := greatest(1, least(coalesce(p_max_rows, 10000), 10000)); v_result jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if exists (select 1 from public.sales_invoices s where s.company_id=v_company_id and s.status not in ('cancelled','void') and greatest(s.total-s.paid_amount,0)>0 offset v_limit limit 1) then raise exception 'EXPORT_TOO_LARGE: receivables export exceeds safe row limit'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('invoice_number',s.invoice_number,'customer',c.name,'invoice_date',s.invoice_date,'due_date',s.due_date,'total',s.total,'paid_amount',s.paid_amount,'balance',case when s.total is null or s.paid_amount is null then null else greatest(s.total-s.paid_amount,0) end) order by s.invoice_date desc), '[]'::jsonb) into v_result
  from public.sales_invoices s left join public.customers c on c.id=s.customer_id and c.company_id=v_company_id
  where s.company_id=v_company_id and s.status not in ('cancelled','void') and greatest(s.total-s.paid_amount,0)>0;
  return jsonb_build_object('rows',v_result,'count',jsonb_array_length(v_result),'as_of',current_date);
end; $$;

revoke all on function public.get_sales_export_rows(uuid, integer) from public;
grant execute on function public.get_sales_export_rows(uuid, integer) to authenticated;
revoke all on function public.get_purchase_export_rows(uuid, integer) from public;
grant execute on function public.get_purchase_export_rows(uuid, integer) to authenticated;
revoke all on function public.get_inventory_export_rows(uuid, integer) from public;
grant execute on function public.get_inventory_export_rows(uuid, integer) to authenticated;
revoke all on function public.get_receivables_export_rows(uuid, integer) from public;
grant execute on function public.get_receivables_export_rows(uuid, integer) to authenticated;
