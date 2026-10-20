create table if not exists public.alternative_item_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  name text not null,
  description text,
  base_unit text not null default 'unit',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alternative_item_group_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  group_id uuid not null references public.alternative_item_groups(id) on delete cascade,
  sku text not null,
  conversion_factor numeric(18,6) not null default 1 check (conversion_factor > 0),
  created_at timestamptz not null default now(),
  unique(company_id, group_id, sku),
  unique(company_id, sku)
);

create index if not exists idx_alt_groups_company on public.alternative_item_groups(company_id, is_active);
create index if not exists idx_alt_group_members_company on public.alternative_item_group_members(company_id, group_id);
create index if not exists idx_alt_group_members_sku on public.alternative_item_group_members(company_id, sku);

alter table public.alternative_item_groups enable row level security;
alter table public.alternative_item_group_members enable row level security;

create policy "company scoped alternative groups" on public.alternative_item_groups
  for all using (company_id = 'a0000000-0000-0000-0000-000000000001'::uuid)
  with check (company_id = 'a0000000-0000-0000-0000-000000000001'::uuid);

create policy "company scoped alternative group members" on public.alternative_item_group_members
  for all using (company_id = 'a0000000-0000-0000-0000-000000000001'::uuid)
  with check (company_id = 'a0000000-0000-0000-0000-000000000001'::uuid);
