-- Restore parity for live public.customer_credit_accounts discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.
-- Forward-only; preserves tenant/customer boundaries and fail-closed RLS.

create table if not exists public.customer_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null unique,
  currency text not null default 'SAR'::text,
  credit_limit numeric not null default 0,
  outstanding_balance numeric not null default 0,
  available_credit numeric generated always as (greatest(credit_limit - outstanding_balance, 0::numeric)) stored,
  updated_at timestamptz not null default now()
);

do $function$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_credit_accounts_company_id_fkey'
      and conrelid = 'public.customer_credit_accounts'::regclass
  ) then
    alter table public.customer_credit_accounts
      add constraint customer_credit_accounts_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_credit_accounts_customer_id_fkey'
      and conrelid = 'public.customer_credit_accounts'::regclass
  ) then
    alter table public.customer_credit_accounts
      add constraint customer_credit_accounts_customer_id_fkey
      foreign key (customer_id) references public.customers(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_credit_accounts_customer_id_key'
      and conrelid = 'public.customer_credit_accounts'::regclass
  ) then
    alter table public.customer_credit_accounts
      add constraint customer_credit_accounts_customer_id_key
      unique (customer_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_credit_accounts_currency_format'
      and conrelid = 'public.customer_credit_accounts'::regclass
  ) then
    alter table public.customer_credit_accounts
      add constraint customer_credit_accounts_currency_format
      check (currency ~ '^[A-Z]{3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_credit_accounts_credit_limit_nonnegative'
      and conrelid = 'public.customer_credit_accounts'::regclass
  ) then
    alter table public.customer_credit_accounts
      add constraint customer_credit_accounts_credit_limit_nonnegative
      check (credit_limit >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_credit_accounts_outstanding_nonnegative'
      and conrelid = 'public.customer_credit_accounts'::regclass
  ) then
    alter table public.customer_credit_accounts
      add constraint customer_credit_accounts_outstanding_nonnegative
      check (outstanding_balance >= 0);
  end if;
end
$function$;

create index if not exists idx_customer_credit_accounts_company_id
  on public.customer_credit_accounts(company_id);

create index if not exists idx_customer_credit_accounts_customer_id
  on public.customer_credit_accounts(customer_id);

alter table public.customer_credit_accounts enable row level security;

drop policy if exists credit_customer_select on public.customer_credit_accounts;
create policy credit_customer_select
  on public.customer_credit_accounts
  as permissive
  for select
  to authenticated
  using (
    customer_id = public.current_customer_id()
    and company_id = public.current_customer_company_id()
  );

revoke all on table public.customer_credit_accounts from anon;
revoke all on table public.customer_credit_accounts from authenticated;
grant select on table public.customer_credit_accounts to authenticated;
grant all on table public.customer_credit_accounts to service_role;
