import fs from 'node:fs';

const source = fs.readFileSync(new URL('../supabase/migrations/20261003214500_harden_enqueue_report_execution_tenant_binding.sql', import.meta.url), 'utf8');

for (const marker of [
  'v_is_service_role boolean',
  'auth.uid() is null',
  "public.current_company_id()",
  "raise exception 'TENANT_CONTEXT_MISMATCH'",
  'p_force_reprocess boolean DEFAULT false',
]) {
  if (!source.includes(marker)) throw new Error('Missing tenant-binding security invariant: ' + marker);
}
if ((source.match(/CREATE OR REPLACE FUNCTION public\.enqueue_report_execution_job/g) || []).length !== 2) {
  throw new Error('Expected both enqueue_report_execution_job overloads to be hardened');
}
console.log('enqueue-tenant-binding: PASS');
