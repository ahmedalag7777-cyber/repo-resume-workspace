-- Canonical domain truth for dashboard secondary sales analytics.
-- Tenant authority is always the authenticated database context; the caller-supplied
-- company id is compatibility-only and must match current_company_id().
create or replace function public.get_sales_secondary_metrics(
  p_company_id uuid,
  p_months integer default 6,
  p_limit integer default 5,
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
  v_as_of date := coalesce(p_to, current_date);
  v_months integer := greatest(1, least(coalesce(p_months, 6), 24));
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 100));
  v_result jsonb;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'TENANT_CONTEXT_MISMATCH'; end if;
  if p_from is not null and p_to is not null and p_from > p_to then raise exception 'REPORT_DATE_RANGE_INVALID'; end if;

  with filtered_invoices as (
    select s.id, s.customer_id, s.subtotal, s.total, s.paid_amount, s.due_date, s.invoice_date
    from public.sales_invoices s
    where s.company_id = v_company_id
      and s.status not in ('cancelled', 'void')
      and (p_from is null or s.invoice_date >= p_from)
      and (p_to is null or s.invoice_date <= p_to)
  ),
  filtered_items as (
    select si.invoice_id, si.product_id, si.quantity, si.line_total, si.cost_price,
           p.name as product_name, c.name as category_name
    from public.sale_items si
    join filtered_invoices fi on fi.id = si.invoice_id
    left join public.products p on p.id = si.product_id and p.company_id = v_company_id
    left join public.categories c on c.id = p.category_id and c.company_id = v_company_id
  ),
  monthly as (
    select jsonb_agg(jsonb_build_object(
      'month', to_char(m.month_start, 'YYYY-MM'),
      'label', case extract(month from m.month_start)::int
        when 1 then 'يناير' when 2 then 'فبراير' when 3 then 'مارس' when 4 then 'أبريل'
        when 5 then 'مايو' when 6 then 'يونيو' when 7 then 'يوليو' when 8 then 'أغسطس'
        when 9 then 'سبتمبر' when 10 then 'أكتوبر' when 11 then 'نوفمبر' when 12 then 'ديسمبر' end,
      'sales', coalesce(x.sales, 0), 'cost', coalesce(x.cost, 0),
      'profit', coalesce(x.sales, 0) - coalesce(x.cost, 0), 'invoices', coalesce(x.invoices, 0)
    ) order by m.month_start) as value
    from generate_series(
      date_trunc('month', v_as_of)::date - ((v_months - 1) * interval '1 month'),
      date_trunc('month', v_as_of)::date, interval '1 month'
    ) m(month_start)
    left join (
      select date_trunc('month', fi.invoice_date)::date as month_start,
             sum(fi.subtotal) as sales, sum(coalesce(fi_cost.cost, 0)) as cost, count(*)::integer as invoices
      from filtered_invoices fi
      left join (
        select invoice_id, sum(quantity * cost_price) as cost
        from filtered_items where cost_price is not null and quantity is not null group by invoice_id
      ) fi_cost on fi_cost.invoice_id = fi.id
      group by date_trunc('month', fi.invoice_date)::date
    ) x on x.month_start = m.month_start
  ),
  top_customers as (
    select coalesce(jsonb_agg(jsonb_build_object('id', q.customer_id, 'name', q.name, 'value', q.value) order by q.value desc), '[]'::jsonb) as value
    from (
      select fi.customer_id, coalesce(c.name, fi.customer_id::text) as name, sum(fi.subtotal) as value
      from filtered_invoices fi
      left join public.customers c on c.id = fi.customer_id and c.company_id = v_company_id
      group by fi.customer_id, c.name order by value desc limit v_limit
    ) q
  ),
  top_products as (
    select coalesce(jsonb_agg(jsonb_build_object('id', q.product_id, 'name', q.name, 'value', q.value, 'secondary', q.quantity) order by q.value desc), '[]'::jsonb) as value
    from (
      select fi.product_id, coalesce(fi.product_name, fi.product_id::text) as name,
             sum(fi.line_total) as value, sum(fi.quantity) as quantity
      from filtered_items fi where fi.product_id is not null
      group by fi.product_id, fi.product_name order by value desc limit v_limit
    ) q
  ),
  categories as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', q.name, 'sales', q.sales,
      'profit', case when q.missing_cost > 0 then null else q.sales - q.cost end,
      'quantity', q.quantity,
      'data_status', case when q.missing_cost > 0 then 'INSUFFICIENT_DATA' else 'CALCULATED' end
    ) order by q.sales desc), '[]'::jsonb) as value
    from (
      select coalesce(fi.category_name, 'غير مصنف') as name,
             sum(fi.line_total) as sales,
             sum(case when fi.cost_price is null or fi.quantity is null then 0 else fi.quantity * fi.cost_price end) as cost,
             sum(fi.quantity) as quantity,
             count(*) filter (where fi.cost_price is null or fi.quantity is null) as missing_cost
      from filtered_items fi group by coalesce(fi.category_name, 'غير مصنف')
    ) q
  ),
  aging_rows as (
    select case
      when fi.due_date is null then 'UNDATED'
      when greatest(0, v_as_of - fi.due_date) <= 30 then '0-30'
      when greatest(0, v_as_of - fi.due_date) <= 60 then '31-60'
      when greatest(0, v_as_of - fi.due_date) <= 90 then '61-90'
      else '90+' end as bucket,
      case
        when fi.due_date is null then 5
        when greatest(0, v_as_of - fi.due_date) <= 30 then 1
        when greatest(0, v_as_of - fi.due_date) <= 60 then 2
        when greatest(0, v_as_of - fi.due_date) <= 90 then 3
        else 4 end as bucket_order,
      greatest(fi.total - fi.paid_amount, 0) as outstanding
    from filtered_invoices fi
    where greatest(fi.total - fi.paid_amount, 0) > 0
  ),
  aging as (
    select coalesce(jsonb_agg(jsonb_build_object('bucket', q.bucket, 'amount', q.amount, 'count', q.count) order by q.bucket_order), '[]'::jsonb) as value
    from (
      select bucket, bucket_order, sum(outstanding) as amount, count(*)::integer as count
      from aging_rows group by bucket, bucket_order
    ) q
  )
  select jsonb_build_object(
    'as_of', v_as_of, 'months', v_months, 'limit', v_limit,
    'monthly_trend', coalesce(monthly.value, '[]'::jsonb),
    'top_customers', top_customers.value, 'top_products', top_products.value,
    'category_breakdown', categories.value, 'aging_buckets', aging.value
  ) into v_result
  from monthly, top_customers, top_products, categories, aging;

  return v_result;
end;
$$;

revoke all on function public.get_sales_secondary_metrics(uuid, integer, integer, date, date) from public;
grant execute on function public.get_sales_secondary_metrics(uuid, integer, integer, date, date) to authenticated;
