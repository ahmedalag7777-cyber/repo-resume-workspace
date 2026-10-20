create or replace function public.get_profitability_snapshot(p_as_of date default current_date)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_currency text;
  v_result jsonb;
begin
  if v_company_id is null then
    raise exception 'TENANT_CONTEXT_REQUIRED';
  end if;

  select c.currency into v_currency
  from public.companies c
  where c.id = v_company_id;

  with sales_base as (
    select s.id, s.subtotal, s.total, s.paid_amount, s.currency
    from public.sales_invoices s
    where s.company_id = v_company_id
      and s.status is not null
      and s.status not in ('cancelled','void')
      and s.invoice_date <= p_as_of
  ),
  items as (
    select si.invoice_id, si.quantity, si.cost_price, si.line_total
    from public.sale_items si
    join sales_base s on s.id = si.invoice_id
  ),
  quality as (
    select
      count(*) filter (where subtotal is null or total is null or paid_amount is null) as bad_invoice_rows,
      (select count(*) from items where quantity is null or cost_price is null or line_total is null) as bad_sale_item_rows,
      (select count(*) from sales_base where currency is not null and v_currency is not null and currency <> v_currency) as currency_mismatch_rows
    from sales_base
  ),
  totals as (
    select
      coalesce(sum(s.subtotal) filter (where s.subtotal is not null),0)::numeric as revenue,
      coalesce((select sum(i.quantity * i.cost_price) from items i where i.quantity is not null and i.cost_price is not null),0)::numeric as cost,
      count(*)::integer as invoice_count
    from sales_base s
  )
  select jsonb_build_object(
    'status', case when q.bad_invoice_rows = 0 and q.bad_sale_item_rows = 0 and q.currency_mismatch_rows = 0 and t.invoice_count > 0 then 'CALCULATED' else 'INSUFFICIENT_DATA' end,
    'currency', v_currency,
    'currency_status', case when q.currency_mismatch_rows = 0 and v_currency is not null then 'CONSISTENT' else 'INSUFFICIENT_DATA' end,
    'revenue', case when q.bad_invoice_rows = 0 then t.revenue else null end,
    'cost', case when q.bad_sale_item_rows = 0 then t.cost else null end,
    'gross_profit', case when q.bad_invoice_rows = 0 and q.bad_sale_item_rows = 0 then t.revenue - t.cost else null end,
    'gross_margin', case when q.bad_invoice_rows = 0 and q.bad_sale_item_rows = 0 and t.revenue <> 0 then ((t.revenue - t.cost) / t.revenue) * 100 else null end,
    'invoice_count', t.invoice_count,
    'bad_invoice_rows', q.bad_invoice_rows,
    'bad_sale_item_rows', q.bad_sale_item_rows,
    'currency_mismatch_rows', q.currency_mismatch_rows,
    'reasons', case
      when q.bad_invoice_rows > 0 or q.bad_sale_item_rows > 0 or q.currency_mismatch_rows > 0 or t.invoice_count = 0
      then to_jsonb(array_remove(array[
        case when q.bad_invoice_rows > 0 then 'INVOICE_DATA_QUALITY' end,
        case when q.bad_sale_item_rows > 0 then 'SALE_ITEM_DATA_QUALITY' end,
        case when q.currency_mismatch_rows > 0 then 'CURRENCY_MISMATCH' end,
        case when t.invoice_count = 0 then 'NO_SALES_DATA' end
      ], null))
      else '[]'::jsonb
    end,
    'as_of', p_as_of
  ) into v_result
  from quality q cross join totals t;

  return v_result;
end;
$$;

grant execute on function public.get_profitability_snapshot(date) to authenticated;
revoke execute on function public.get_profitability_snapshot(date) from anon;
