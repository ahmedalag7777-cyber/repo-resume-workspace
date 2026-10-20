-- Restore parity for the live public.client_ui_settings relation discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-09-25.
-- Forward-only; mirrors the live table shape, tenant FK, uniqueness, RLS, policy and role grants.

create table if not exists public.client_ui_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  config jsonb not null default '{"showExcel": true, "showCredit": true, "showSearch": true, "showInventory": true, "showTemplates": true, "showCategories": true, "showQuickOrder": true, "showRetailPrice": false}'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_ui_settings_organization_id_fkey'
      and conrelid = 'public.client_ui_settings'::regclass
  ) then
    alter table public.client_ui_settings
      add constraint client_ui_settings_organization_id_fkey
      foreign key (organization_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'client_ui_settings_organization_id_key'
      and conrelid = 'public.client_ui_settings'::regclass
  ) then
    alter table public.client_ui_settings
      add constraint client_ui_settings_organization_id_key
      unique (organization_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'client_ui_settings_config_shape_check'
      and conrelid = 'public.client_ui_settings'::regclass
  ) then
    alter table public.client_ui_settings
      add constraint client_ui_settings_config_shape_check
      check (
        jsonb_typeof(config) = 'object'
        and coalesce(jsonb_typeof(config -> 'showSearch'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showCategories'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showExcel'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showQuickOrder'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showTemplates'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showCredit'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showInventory'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showRetailPrice'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'requireQuantityConfirmation'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showTieredPricing'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showSavingsCalculator'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showImageSearch'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showVoiceSearch'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'showPaymentMethods'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'paymentOnCredit'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'paymentCash'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'paymentTransfer'), 'boolean') = 'boolean'
        and coalesce(jsonb_typeof(config -> 'minOrderValue'), 'number') = 'number'
        and coalesce(jsonb_typeof(config -> 'maxOrderValue'), 'number') = 'number'
        and coalesce(jsonb_typeof(config -> 'maxTemplates'), 'number') = 'number'
      );
  end if;
end
$$;

create or replace function public.current_customer_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $function$
  select public.current_company_id();
$function$;

revoke all on function public.current_customer_company_id() from public, anon;
grant execute on function public.current_customer_company_id() to authenticated, service_role;

alter table public.client_ui_settings enable row level security;

drop policy if exists ui_settings_customer_select on public.client_ui_settings;
create policy ui_settings_customer_select
  on public.client_ui_settings
  as permissive
  for select
  to authenticated
  using (organization_id = public.current_customer_company_id());

revoke all on table public.client_ui_settings from anon;
revoke all on table public.client_ui_settings from authenticated;
grant select, insert, update on table public.client_ui_settings to authenticated;
grant all on table public.client_ui_settings to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'client_ui_settings'
     ) then
    alter publication supabase_realtime add table public.client_ui_settings;
  end if;
end
$$;