-- Restore parity for live public.source_analysis_snapshots discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.

create table if not exists public.source_analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  import_job_id uuid,
  source_hash text not null,
  source_path text not null,
  source_format text not null,
  analysis_status text not null,
  entity_type text not null,
  quality_score numeric,
  row_count integer not null default 0,
  column_count integer not null default 0,
  datasets jsonb not null default '[]'::jsonb,
  canonical_text text not null default ''::text,
  visual_assets jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint source_analysis_snapshots_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  constraint source_analysis_snapshots_import_job_id_fkey
    foreign key (import_job_id) references public.import_jobs(id) on delete set null,
  constraint source_analysis_snapshots_analysis_status_check
    check (analysis_status = any (array['analyzed','completed','failed','skipped']))
);

create index if not exists idx_source_analysis_snapshots_company_source
  on public.source_analysis_snapshots(company_id, source_hash);

create index if not exists idx_source_analysis_snapshots_import_job
  on public.source_analysis_snapshots(import_job_id);

alter table public.source_analysis_snapshots enable row level security;

drop policy if exists source_analysis_snapshots_insert on public.source_analysis_snapshots;
create policy source_analysis_snapshots_insert
  on public.source_analysis_snapshots
  for insert to authenticated
  with check ((select public.current_company_id()) = company_id);

drop policy if exists source_analysis_snapshots_select on public.source_analysis_snapshots;
create policy source_analysis_snapshots_select
  on public.source_analysis_snapshots
  for select to authenticated
  using ((select public.current_company_id()) = company_id);

revoke all on table public.source_analysis_snapshots from anon;
revoke all on table public.source_analysis_snapshots from authenticated;
grant select, insert on table public.source_analysis_snapshots to authenticated;
grant all on table public.source_analysis_snapshots to service_role;
