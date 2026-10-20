-- Restore parity for live customer/order auxiliary relations discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.
-- Forward-only; preserves tenant/customer access boundaries and fail-closed RLS.

create table if not exists public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null,
  created_at timestamptz not null default now(),
  constraint customer_invitations_email_format check (position('@' in email) > 1),
  constraint customer_invitations_customer_id_fkey foreign key (customer_id) references public.customers(id) on delete cascade,
  constraint customer_invitations_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint customer_invitations_invited_by_fkey foreign key (invited_by) references auth.users(id) on delete restrict
);

create index if not exists idx_customer_invitations_company_id on public.customer_invitations(company_id);
create index if not exists idx_customer_invitations_customer_id on public.customer_invitations(customer_id);
create index if not exists idx_customer_invitations_invited_by on public.customer_invitations(invited_by);

alter table public.customer_invitations enable row level security;
drop policy if exists customer_invitations_staff_select on public.customer_invitations;
create policy customer_invitations_staff_select
  on public.customer_invitations
  for select to authenticated
  using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.company_memberships cm
      where cm.company_id = customer_invitations.company_id
        and cm.user_id = (select auth.uid())
        and cm.is_active
        and cm.role = any (array['owner','admin','sales'])
    )
  );
revoke all on table public.customer_invitations from anon;
revoke all on table public.customer_invitations from authenticated;
grant select on table public.customer_invitations to authenticated;
grant all on table public.customer_invitations to service_role;

create table if not exists public.customer_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null,
  reference text,
  description text not null,
  debit numeric not null default 0,
  credit numeric not null default 0,
  due_date date,
  status text not null default 'open',
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now(),
  constraint customer_ledger_entries_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint customer_ledger_entries_customer_id_fkey foreign key (customer_id) references public.customers(id) on delete cascade,
  constraint customer_ledger_entries_debit_nonnegative check (debit >= 0),
  constraint customer_ledger_entries_credit_nonnegative check (credit >= 0)
);

create index if not exists idx_customer_ledger_entries_company_customer on public.customer_ledger_entries(company_id, customer_id);
create index if not exists idx_customer_ledger_entries_due_date on public.customer_ledger_entries(due_date);
create index if not exists idx_customer_ledger_entries_source on public.customer_ledger_entries(source_type, source_id);

alter table public.customer_ledger_entries enable row level security;
drop policy if exists ledger_customer_select on public.customer_ledger_entries;
create policy ledger_customer_select
  on public.customer_ledger_entries
  for select to authenticated
  using (
    customer_id = public.current_customer_id()
    and company_id = public.current_customer_company_id()
  );
revoke all on table public.customer_ledger_entries from anon;
revoke all on table public.customer_ledger_entries from authenticated;
grant select on table public.customer_ledger_entries to authenticated;
grant all on table public.customer_ledger_entries to service_role;

create table if not exists public.customer_price_tiers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null,
  product_id uuid not null,
  min_quantity integer not null,
  unit_price numeric not null,
  currency text not null default 'SAR'::text,
  created_at timestamptz not null default now(),
  constraint customer_price_tiers_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint customer_price_tiers_customer_id_fkey foreign key (customer_id) references public.customers(id) on delete cascade,
  constraint customer_price_tiers_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade,
  constraint customer_price_tiers_min_quantity_positive check (min_quantity > 0),
  constraint customer_price_tiers_unit_price_nonnegative check (unit_price >= 0),
  constraint customer_price_tiers_currency_format check (currency ~ '^[A-Z]{3}$')
);

create index if not exists idx_customer_price_tiers_company_customer_product on public.customer_price_tiers(company_id, customer_id, product_id);
create index if not exists idx_customer_price_tiers_product on public.customer_price_tiers(product_id);

alter table public.customer_price_tiers enable row level security;
drop policy if exists price_tiers_customer_select on public.customer_price_tiers;
create policy price_tiers_customer_select
  on public.customer_price_tiers
  for select to authenticated
  using (
    customer_id = public.current_customer_id()
    and company_id = public.current_customer_company_id()
  );
revoke all on table public.customer_price_tiers from anon;
revoke all on table public.customer_price_tiers from authenticated;
grant select on table public.customer_price_tiers to authenticated;
grant all on table public.customer_price_tiers to service_role;

create table if not exists public.order_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null,
  name text not null,
  branch_label text not null default 'الرئيسي'::text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_templates_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint order_templates_customer_id_fkey foreign key (customer_id) references public.customers(id) on delete cascade,
  constraint order_templates_created_by_fkey foreign key (created_by) references auth.users(id) on delete restrict,
  constraint order_templates_name_length check (length(trim(name)) >= 1 and length(trim(name)) <= 120)
);

create index if not exists idx_order_templates_company_customer on public.order_templates(company_id, customer_id);
create index if not exists idx_order_templates_created_by on public.order_templates(created_by);

alter table public.order_templates enable row level security;
drop policy if exists templates_customer_select on public.order_templates;
create policy templates_customer_select
  on public.order_templates
  for select to authenticated
  using (
    customer_id = public.current_customer_id()
    and company_id = public.current_customer_company_id()
  );
revoke all on table public.order_templates from anon;
revoke all on table public.order_templates from authenticated;
grant select on table public.order_templates to authenticated;
grant all on table public.order_templates to service_role;

create table if not exists public.order_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  product_id uuid not null,
  quantity integer not null,
  unit text not null,
  created_at timestamptz not null default now(),
  constraint order_template_items_template_id_fkey foreign key (template_id) references public.order_templates(id) on delete cascade,
  constraint order_template_items_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade,
  constraint order_template_items_quantity_positive check (quantity > 0)
);

create index if not exists idx_order_template_items_template_id on public.order_template_items(template_id);
create index if not exists idx_order_template_items_product_id on public.order_template_items(product_id);

alter table public.order_template_items enable row level security;
drop policy if exists template_items_customer_select on public.order_template_items;
create policy template_items_customer_select
  on public.order_template_items
  for select to authenticated
  using (
    exists (
      select 1 from public.order_templates t
      where t.id = order_template_items.template_id
        and t.customer_id = public.current_customer_id()
        and t.company_id = public.current_customer_company_id()
    )
  );
revoke all on table public.order_template_items from anon;
revoke all on table public.order_template_items from authenticated;
grant select on table public.order_template_items to authenticated;
grant all on table public.order_template_items to service_role;

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  order_id uuid not null,
  from_status text,
  to_status text not null,
  actor_id uuid,
  created_at timestamptz not null default now(),
  constraint order_status_history_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint order_status_history_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint order_status_history_actor_id_fkey foreign key (actor_id) references auth.users(id) on delete set null
);

create index if not exists idx_order_status_history_company_order on public.order_status_history(company_id, order_id);
create index if not exists idx_order_status_history_actor on public.order_status_history(actor_id);

alter table public.order_status_history enable row level security;
drop policy if exists order_status_history_staff_read on public.order_status_history;
create policy order_status_history_staff_read
  on public.order_status_history
  for select to authenticated
  using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.company_memberships cm
      where cm.company_id = order_status_history.company_id
        and cm.user_id = (select auth.uid())
        and cm.is_active
        and cm.role = any (array['owner','admin','sales','warehouse'])
    )
  );
revoke all on table public.order_status_history from anon;
revoke all on table public.order_status_history from authenticated;
grant select on table public.order_status_history to authenticated;
grant all on table public.order_status_history to service_role;

create table if not exists public.order_outbox_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  order_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  constraint order_outbox_events_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint order_outbox_events_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade
);

create index if not exists idx_order_outbox_events_company_order on public.order_outbox_events(company_id, order_id);
create index if not exists idx_order_outbox_events_pending on public.order_outbox_events(company_id, delivered_at, created_at);

alter table public.order_outbox_events enable row level security;
drop policy if exists order_outbox_staff_read on public.order_outbox_events;
create policy order_outbox_staff_read
  on public.order_outbox_events
  for select to authenticated
  using (
    company_id = public.current_company_id()
    and exists (
      select 1 from public.company_memberships cm
      where cm.company_id = order_outbox_events.company_id
        and cm.user_id = (select auth.uid())
        and cm.is_active
        and cm.role = any (array['owner','admin','sales','warehouse'])
    )
  );
revoke all on table public.order_outbox_events from anon;
revoke all on table public.order_outbox_events from authenticated;
grant select on table public.order_outbox_events to authenticated;
grant all on table public.order_outbox_events to service_role;
