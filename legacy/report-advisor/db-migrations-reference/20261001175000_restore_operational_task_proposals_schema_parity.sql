-- Restore parity for live public.operational_task_proposals discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.
-- Forward-only; keeps tenant-scoped proposal/decision/work references.

create table if not exists public.operational_task_proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  role text not null,
  horizon text not null,
  priority text not null,
  title text not null,
  reason text not null,
  source_type text not null,
  source_id uuid,
  expected_outcome text not null,
  evidence_required jsonb not null default '[]'::jsonb,
  status text not null default 'proposed',
  converted_work_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  task_key text not null,
  decision_id uuid,
  constraint operational_task_proposals_role_check check (role = any (array['manager','employee','sales','warehouse','accountant','purchasing'])),
  constraint operational_task_proposals_horizon_check check (horizon = any (array['today','tomorrow'])),
  constraint operational_task_proposals_priority_check check (priority = any (array['critical','high','medium','low'])),
  constraint operational_task_proposals_source_type_check check (source_type = any (array['recommendation','alert','forecast','kpi'])),
  constraint operational_task_proposals_status_check check (status = any (array['proposed','accepted','dismissed','converted'])),
  constraint operational_task_proposals_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint operational_task_proposals_converted_work_item_id_fkey foreign key (converted_work_item_id) references public.decision_work_items(id) on delete set null,
  constraint operational_task_proposals_decision_id_fkey foreign key (decision_id) references public.business_intelligence_decisions(id) on delete set null
);

create index if not exists idx_operational_task_proposals_company_status
  on public.operational_task_proposals(company_id, status);

create index if not exists idx_operational_task_proposals_decision
  on public.operational_task_proposals(decision_id);

create index if not exists idx_operational_task_proposals_work_item
  on public.operational_task_proposals(converted_work_item_id);

create index if not exists idx_operational_task_proposals_task_key
  on public.operational_task_proposals(company_id, task_key);

alter table public.operational_task_proposals enable row level security;

drop policy if exists operational_task_proposals_insert on public.operational_task_proposals;
create policy operational_task_proposals_insert
  on public.operational_task_proposals
  for insert to authenticated
  with check ((select public.current_company_id()) = company_id);

drop policy if exists operational_task_proposals_select on public.operational_task_proposals;
create policy operational_task_proposals_select
  on public.operational_task_proposals
  for select to authenticated
  using ((select public.current_company_id()) = company_id);

drop policy if exists operational_task_proposals_update on public.operational_task_proposals;
create policy operational_task_proposals_update
  on public.operational_task_proposals
  for update to authenticated
  using ((select public.current_company_id()) = company_id)
  with check ((select public.current_company_id()) = company_id);

revoke all on table public.operational_task_proposals from anon;
revoke all on table public.operational_task_proposals from authenticated;
grant select, insert, update on table public.operational_task_proposals to authenticated;
grant all on table public.operational_task_proposals to service_role;
