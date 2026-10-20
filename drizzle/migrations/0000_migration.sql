create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role public.app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create or replace function public.handle_new_user_role() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.user_roles(user_id, role) values (new.id, case when not exists(select 1 from public.user_roles where role='admin') then 'admin'::public.app_role else 'user'::public.app_role end) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users for each row execute function public.handle_new_user_role();

create table public.analyses (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), file_name text not null, file_hash text, engine_version text not null, archetype text, domain text, row_count int not null default 0, column_count int not null default 0, available_count int not null default 0, quality_score numeric, result jsonb not null, created_at timestamptz not null default now());
create table public.decisions (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), analysis_id uuid not null references public.analyses(id) on delete cascade, finding_id text not null, verdict text not null, note text, created_at timestamptz not null default now());
create table public.mapping_feedback (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), header_norm text not null, field text not null, created_at timestamptz not null default now());
create table public.work_tasks (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), analysis_id uuid not null references public.analyses(id) on delete cascade, finding_id text, title text not null, detail text, role text not null, priority text not null default 'medium', status text not null default 'todo', due_date date, outcome_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
do $$ declare t text; begin foreach t in array array['analyses','decisions','mapping_feedback','work_tasks'] loop
 execute format('grant select,insert,update,delete on public.%I to authenticated; grant all on public.%I to service_role; alter table public.%I enable row level security;', t,t,t);
 execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
end loop; end $$;
create index on public.analyses(user_id, created_at desc); create index on public.work_tasks(user_id, status); create index on public.decisions(analysis_id);