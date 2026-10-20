-- Forward-only replay reconciliation for the verified watched-folder/provenance contract.
-- This records the final tenant-bound schema/invariants observed in Staging without
-- rewriting historical migration versions or mutating Staging.

create table if not exists public.watched_report_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  logical_path text,
  enabled boolean not null default true,
  recursive boolean not null default true,
  poll_interval_ms integer not null default 30000,
  auto_process boolean not null default true,
  process_only_changed_rows boolean not null default true,
  max_concurrent_files integer not null default 2,
  retry_limit integer not null default 3,
  accepted_extensions text[] not null default ARRAY['.pdf','.xlsx','.xls','.csv','.docx','.doc','.txt']::text[],
  last_scan_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,label),
  unique(company_id,id)
);

create table if not exists public.watched_report_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  folder_id uuid not null,
  relative_path text not null,
  content_hash text not null,
  size_bytes bigint not null default 0,
  modified_at timestamptz,
  state text not null,
  last_processed_at timestamptz,
  last_successful_checkpoint text,
  last_error text,
  source_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,folder_id,relative_path),
  unique(company_id,id),
  foreign key(company_id,folder_id) references public.watched_report_folders(company_id,id) on delete cascade
);

create table if not exists public.canonical_text_provenance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  folder_id uuid,
  file_id uuid,
  source_hash text not null,
  text_hash text,
  source_type text not null,
  extraction_status text not null,
  analysis_input_mode text not null,
  text_storage_path text,
  extracted_at timestamptz not null default now(),
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  unique(company_id,source_hash),
  foreign key(company_id,folder_id) references public.watched_report_folders(company_id,id) on delete set null,
  foreign key(company_id,file_id) references public.watched_report_files(company_id,id) on delete set null
);

alter table public.watched_report_folders enable row level security;
alter table public.watched_report_files enable row level security;
alter table public.canonical_text_provenance enable row level security;

drop policy if exists watched_report_folders_tenant on public.watched_report_folders;
create policy watched_report_folders_tenant on public.watched_report_folders for all to authenticated
  using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
drop policy if exists watched_report_files_tenant on public.watched_report_files;
create policy watched_report_files_tenant on public.watched_report_files for all to authenticated
  using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
drop policy if exists canonical_text_provenance_tenant on public.canonical_text_provenance;
create policy canonical_text_provenance_tenant on public.canonical_text_provenance for all to authenticated
  using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());

alter table public.watched_report_folders drop constraint if exists watched_report_folders_poll_interval_ms_check;
alter table public.watched_report_folders add constraint watched_report_folders_poll_interval_ms_check check (poll_interval_ms >= 1000);
alter table public.watched_report_folders drop constraint if exists watched_report_folders_max_concurrent_files_check;
alter table public.watched_report_folders add constraint watched_report_folders_max_concurrent_files_check check (max_concurrent_files >= 1 and max_concurrent_files <= 8);
alter table public.watched_report_folders drop constraint if exists watched_report_folders_retry_limit_check;
alter table public.watched_report_folders add constraint watched_report_folders_retry_limit_check check (retry_limit >= 1 and retry_limit <= 10);

alter table public.watched_report_files drop constraint if exists watched_report_files_relative_path_nonblank_check;
alter table public.watched_report_files add constraint watched_report_files_relative_path_nonblank_check check (relative_path ~ '[^[:space:]]');
alter table public.watched_report_files drop constraint if exists watched_report_files_content_hash_nonblank_check;
alter table public.watched_report_files add constraint watched_report_files_content_hash_nonblank_check check (content_hash ~ '[^[:space:]]');
alter table public.watched_report_files drop constraint if exists watched_report_files_size_bytes_nonnegative_check;
alter table public.watched_report_files add constraint watched_report_files_size_bytes_nonnegative_check check (size_bytes >= 0);
alter table public.watched_report_files drop constraint if exists watched_report_files_source_version_positive_check;
alter table public.watched_report_files add constraint watched_report_files_source_version_positive_check check (source_version >= 1);
alter table public.watched_report_files drop constraint if exists watched_report_files_state_check;
alter table public.watched_report_files add constraint watched_report_files_state_check check (state in ('new','changed','unchanged','processing','processed','failed','dead_letter','deleted'));

alter table public.canonical_text_provenance drop constraint if exists canonical_text_provenance_extraction_status_check;
alter table public.canonical_text_provenance add constraint canonical_text_provenance_extraction_status_check check (extraction_status in ('not_started','succeeded','failed','partial'));
alter table public.canonical_text_provenance drop constraint if exists canonical_text_provenance_analysis_input_mode_check;
alter table public.canonical_text_provenance add constraint canonical_text_provenance_analysis_input_mode_check check (analysis_input_mode in ('canonical_text','structured_source_fallback'));

-- Existing installations may have the tables from the original 20260825110001 migration.
-- CREATE TABLE IF NOT EXISTS does not backfill the composite uniqueness required
-- by the tenant-bound foreign keys below, so make those uniqueness invariants
-- explicit and replay-safe before the FK declarations execute.
create unique index if not exists uq_watched_report_folders_company_id_id
  on public.watched_report_folders(company_id, id);
create unique index if not exists uq_watched_report_files_company_id_id
  on public.watched_report_files(company_id, id);

create index if not exists idx_watched_report_folders_company on public.watched_report_folders(company_id);
create index if not exists idx_watched_report_files_company_folder on public.watched_report_files(company_id,folder_id);
create index if not exists idx_watched_report_files_state on public.watched_report_files(company_id,state,updated_at);
create index if not exists idx_canonical_text_provenance_company_hash on public.canonical_text_provenance(company_id,source_hash);

create or replace function public.record_watched_report_file(
  p_folder_id uuid, p_relative_path text, p_content_hash text, p_size_bytes bigint,
  p_modified_at timestamptz, p_state text
)
returns uuid language plpgsql security definer set search_path to 'public','pg_catalog' as $function$
declare v_company_id uuid := public.current_company_id(); v_id uuid;
begin
  if v_company_id is null then raise exception 'TENANT_CONTEXT_REQUIRED'; end if;
  if p_folder_id is null then raise exception 'FOLDER_ID_REQUIRED'; end if;
  if p_relative_path is null or length(btrim(p_relative_path))=0 then raise exception 'RELATIVE_PATH_REQUIRED'; end if;
  if p_content_hash is null or length(btrim(p_content_hash))=0 then raise exception 'CONTENT_HASH_REQUIRED'; end if;
  if p_size_bytes is null or p_size_bytes<0 then raise exception 'SIZE_BYTES_INVALID'; end if;
  if p_state is null or p_state not in ('new','changed','unchanged','processing','processed','failed','dead_letter','deleted') then raise exception 'STATE_INVALID'; end if;
  if not exists (select 1 from public.watched_report_folders f where f.id=p_folder_id and f.company_id=v_company_id) then raise exception 'FOLDER_TENANT_MISMATCH'; end if;
  insert into public.watched_report_files(company_id,folder_id,relative_path,content_hash,size_bytes,modified_at,state)
    values(v_company_id,p_folder_id,p_relative_path,p_content_hash,p_size_bytes,p_modified_at,p_state)
    on conflict(company_id,folder_id,relative_path) do update set content_hash=excluded.content_hash,size_bytes=excluded.size_bytes,modified_at=excluded.modified_at,state=excluded.state,source_version=public.watched_report_files.source_version+1,updated_at=now();
  select id into v_id from public.watched_report_files where company_id=v_company_id and folder_id=p_folder_id and relative_path=p_relative_path;
  return v_id;
end;
$function$;

revoke all on function public.record_watched_report_file(uuid,text,text,bigint,timestamptz,text) from public,anon;
grant execute on function public.record_watched_report_file(uuid,text,text,bigint,timestamptz,text) to authenticated;
