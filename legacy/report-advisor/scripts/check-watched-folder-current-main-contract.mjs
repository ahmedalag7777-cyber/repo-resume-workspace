import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260908220000_reconcile_watched_folder_provenance_contract_current_main.sql', 'utf8');

for (const token of [
  'create table if not exists public.watched_report_folders',
  'create table if not exists public.watched_report_files',
  'create table if not exists public.canonical_text_provenance',
  'foreign key(company_id,folder_id)',
  'foreign key(company_id,file_id)',
  'watched_report_files_state_check',
  'watched_report_files_source_version_positive_check',
  'canonical_text_provenance_extraction_status_check',
  'canonical_text_provenance_analysis_input_mode_check',
  'using (company_id = public.current_company_id())',
  'with check (company_id = public.current_company_id())',
  'record_watched_report_file',
  'FOLDER_TENANT_MISMATCH',
  'revoke all on function public.record_watched_report_file',
  'grant execute on function public.record_watched_report_file',
]) assert.ok(migration.includes(token), `missing watched-folder contract invariant: ${token}`);

console.log('Watched-folder current-main contract: PASS');
