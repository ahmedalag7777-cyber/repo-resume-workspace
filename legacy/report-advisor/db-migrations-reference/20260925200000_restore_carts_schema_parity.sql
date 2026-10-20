-- Restore parity for the live public.carts relation discovered by Phase-F logical restore.
-- Source-of-truth: staging project fnqbvfuwbdpwvhcgzksl at 2026-09-25.
-- Forward-only: preserves the live relation shape, tenant FK boundaries, indexes, RLS and authenticated read policy.

create table if not exists public.profiles (
  id uuid primary key,
  organization_id uuid not null,
  customer_id uuid,
  role text not null default 'customer'::text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_organization_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_organization_id_fkey
      foreign key (organization_id) references public.companies(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_customer_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_customer_id_fkey
      foreign key (customer_id) references public.customers(id) on delete set null;
  end if;
end
$$;

create index if not exists profiles_customer_idx
  on public.profiles(customer_id);

create index if not exists profiles_org_idx
  on public.profiles(organization_id);

alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select
  on public.profiles
  as permissive
  for select
  to authenticated
  using (id = (select auth.uid()));

revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant all on table public.profiles to service_role;

create or replace function public.current_customer_id()
returns uuid
language sql
security definer
set search_path = public
as $function$
  select p.customer_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$function$;

create or replace function public.current_customer_company_id()
returns uuid
language sql
security definer
set search_path = public
as $function$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$function$;

revoke all on function public.current_customer_id() from public;
revoke all on function public.current_customer_company_id() from public;
grant execute on function public.current_customer_id() to authenticated, service_role;
grant execute on function public.current_customer_company_id() to authenticated, service_role;

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'carts_company_id_fkey'
      and conrelid = 'public.carts'::regclass
  ) then
    alter table public.carts
      add constraint carts_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'carts_customer_id_fkey'
      and conrelid = 'public.carts'::regclass
  ) then
    alter table public.carts
      add constraint carts_customer_id_fkey
      foreign key (customer_id) references public.customers(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'carts_user_id_fkey'
      and conrelid = 'public.carts'::regclass
  ) then
    alter table public.carts
      add constraint carts_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'carts_company_id_user_id_key'
      and conrelid = 'public.carts'::regclass
  ) then
    alter table public.carts
      add constraint carts_company_id_user_id_key unique (company_id, user_id);
  end if;
end
$$;

create index if not exists idx_carts_customer_id_fk
  on public.carts(customer_id);

create index if not exists idx_carts_user_id_fk
  on public.carts(user_id);

alter table public.carts enable row level security;

drop policy if exists carts_self_select on public.carts;
create policy carts_self_select
  on public.carts
  as permissive
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and customer_id = current_customer_id()
    and company_id = current_customer_company_id()
  );

revoke all on table public.carts from anon;
revoke all on table public.carts from authenticated;
grant select on table public.carts to authenticated;
grant all on table public.carts to service_role;

 
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null,
  product_id uuid not null,
  quantity integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_cart_id_fkey'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_cart_id_fkey
      foreign key (cart_id) references public.carts(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_product_id_fkey'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_product_id_fkey
      foreign key (product_id) references public.products(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_cart_id_product_id_key'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_cart_id_product_id_key unique (cart_id, product_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_quantity_check'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_quantity_check check (quantity > 0 and quantity <= 100000);
  end if;
end
$$;

create index if not exists idx_cart_items_product_id_fk
  on public.cart_items(product_id);

alter table public.cart_items enable row level security;

drop policy if exists cart_items_self_select on public.cart_items;
create policy cart_items_self_select
  on public.cart_items
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = (select auth.uid())
        and c.customer_id = current_customer_id()
        and c.company_id = current_customer_company_id()
    )
  );

revoke all on table public.cart_items from anon;
revoke all on table public.cart_items from authenticated;
grant select on table public.cart_items to authenticated;
grant all on table public.cart_items to service_role;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'branches_id_company_unique'
      and conrelid = 'public.branches'::regclass
  ) then
    alter table public.branches
      add constraint branches_id_company_unique unique (id, company_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'branches_company_id_id_key'
      and conrelid = 'public.branches'::regclass
  ) then
    alter table public.branches
      add constraint branches_company_id_id_key unique (company_id, id);
  end if;
end
$$;

create table if not exists public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  branch_id uuid not null,
  name text not null,
  currency text not null,
  opening_balance numeric not null default 0,
  received numeric not null default 0,
  spent numeric not null default 0,
  current_balance numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cash_accounts_company_id_fkey'
      and conrelid = 'public.cash_accounts'::regclass
  ) then
    alter table public.cash_accounts
      add constraint cash_accounts_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cash_accounts_branch_company_fkey'
      and conrelid = 'public.cash_accounts'::regclass
  ) then
    alter table public.cash_accounts
      add constraint cash_accounts_branch_company_fkey
      foreign key (company_id, branch_id) references public.branches(company_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cash_accounts_currency_format'
      and conrelid = 'public.cash_accounts'::regclass
  ) then
    alter table public.cash_accounts
      add constraint cash_accounts_currency_format
      check (currency = upper(btrim(currency)) and length(btrim(currency)) = 3);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cash_accounts_nonnegative'
      and conrelid = 'public.cash_accounts'::regclass
  ) then
    alter table public.cash_accounts
      add constraint cash_accounts_nonnegative
      check (opening_balance >= 0 and received >= 0 and spent >= 0);
  end if;
end
$$;

create index if not exists idx_cash_accounts_company_branch
  on public.cash_accounts(company_id, branch_id);

alter table public.cash_accounts enable row level security;

drop policy if exists cash_accounts_tenant_select on public.cash_accounts;
create policy cash_accounts_tenant_select
  on public.cash_accounts
  as permissive
  for select
  to authenticated
  using (company_id = public.current_company_id());

revoke all on table public.cash_accounts from anon;
revoke all on table public.cash_accounts from authenticated;
grant select on table public.cash_accounts to authenticated;
grant all on table public.cash_accounts to service_role;

