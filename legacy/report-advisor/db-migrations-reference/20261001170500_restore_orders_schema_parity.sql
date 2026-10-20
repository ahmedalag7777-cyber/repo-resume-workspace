-- Restore parity for live public.orders and public.order_items required by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.
-- Forward-only; customer order access remains tenant- and identity-bound.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null,
  warehouse_id uuid not null,
  order_number bigint generated always as identity unique,
  status text not null default 'pending',
  total numeric not null default 0,
  currency text not null default 'SAR'::text,
  idempotency_key text not null,
  quantity_confirmed_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_company_id_fkey foreign key (company_id) references public.companies(id),
  constraint orders_customer_id_fkey foreign key (customer_id) references public.customers(id),
  constraint orders_warehouse_id_fkey foreign key (warehouse_id) references public.warehouses(id),
  constraint orders_created_by_fkey foreign key (created_by) references auth.users(id),
  constraint orders_status_check check (status = any (array['draft','pending','confirmed','preparing','ready','completed','cancelled'])),
  constraint orders_total_nonnegative check (total >= 0),
  constraint orders_currency_format check (currency ~ '^[A-Z]{3}$')
);

create index if not exists idx_orders_company_customer on public.orders(company_id, customer_id);
create index if not exists idx_orders_warehouse on public.orders(warehouse_id);
create index if not exists idx_orders_created_by on public.orders(created_by);
create unique index if not exists idx_orders_company_idempotency_key on public.orders(company_id, idempotency_key);

alter table public.orders enable row level security;

drop policy if exists orders_customer_select on public.orders;
create policy orders_customer_select
  on public.orders
  for select to authenticated
  using (
    customer_id = public.current_customer_id()
    and company_id = public.current_customer_company_id()
  );

drop policy if exists orders_customer_insert on public.orders;
create policy orders_customer_insert
  on public.orders
  for insert to authenticated
  with check (
    customer_id = public.current_customer_id()
    and company_id = public.current_customer_company_id()
    and created_by = (select auth.uid())
  );

revoke all on table public.orders from anon;
revoke all on table public.orders from authenticated;
grant select, insert on table public.orders to authenticated;
grant all on table public.orders to service_role;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  company_id uuid not null,
  product_id uuid not null,
  quantity numeric not null,
  unit text not null,
  unit_price numeric not null,
  line_total numeric not null,
  created_at timestamptz not null default now(),
  constraint order_items_order_id_fkey foreign key (order_id) references public.orders(id),
  constraint order_items_product_id_fkey foreign key (product_id) references public.products(id),
  constraint order_items_company_id_fkey foreign key (company_id) references public.companies(id),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_unit_price_nonnegative check (unit_price >= 0),
  constraint order_items_line_total_nonnegative check (line_total >= 0)
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_company_product on public.order_items(company_id, product_id);

alter table public.order_items enable row level security;

drop policy if exists order_items_customer_select on public.order_items;
create policy order_items_customer_select
  on public.order_items
  for select to authenticated
  using (
    company_id = public.current_customer_company_id()
    and exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = public.current_customer_id()
        and o.company_id = public.current_customer_company_id()
    )
  );

revoke all on table public.order_items from anon;
revoke all on table public.order_items from authenticated;
grant select on table public.order_items to authenticated;
grant all on table public.order_items to service_role;