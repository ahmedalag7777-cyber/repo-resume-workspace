-- Restore parity for live public.report_execution_tasks discovered by Phase-F logical restore.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.

create table if not exists public.report_execution_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  report_execution_job_id uuid not null,
  task_key text not null,
  stage text not null,
  ordinal integer not null,
  label text not null,
  status text not null default 'queued',
  worker_id text,
  attempt integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_error jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_execution_tasks_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  constraint report_execution_tasks_report_execution_job_id_fkey
    foreign key (report_execution_job_id) references public.report_execution_jobs(id) on delete cascade,
  constraint report_execution_tasks_stage_check
    check (stage = any (array['queued','fingerprinted','extracted','canonicalized','validated','analyzed','decisioned','committed','rendered'])),
  constraint report_execution_tasks_ordinal_check
    check (ordinal >= 1 and ordinal <= 9),
  constraint report_execution_tasks_status_check
    check (status = any (array['queued','running','completed','failed'])),
  constraint report_execution_tasks_attempt_check
    check (attempt >= 0)
);

create index if not exists idx_report_execution_tasks_company_job
  on public.report_execution_tasks(company_id, report_execution_job_id);

create index if not exists idx_report_execution_tasks_company_stage
  on public.report_execution_tasks(company_id, stage);

alter table public.report_execution_tasks enable row level security;

drop policy if exists report_execution_tasks_tenant_select on public.report_execution_tasks;
create policy report_execution_tasks_tenant_select
  on public.report_execution_tasks
  for select to authenticated
  using (company_id = public.current_company_id());

revoke all on table public.report_execution_tasks from anon;
revoke all on table public.report_execution_tasks from authenticated;
grant select on table public.report_execution_tasks to authenticated;
grant all on table public.report_execution_tasks to service_role;
