import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260831010001_storage_tenant_isolation.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

const requiredPolicies = [
  'storage_objects_select_current_tenant',
  'storage_objects_insert_current_tenant',
  'storage_objects_update_current_tenant_owner',
  'storage_objects_delete_current_tenant_owner',
];

for (const policy of requiredPolicies) {
  if (!sql.includes(`create policy "${policy}"`)) {
    throw new Error(`missing storage tenant policy: ${policy}`);
  }
}

if (!sql.includes("to authenticated")) throw new Error('storage policies must be authenticated-only');
if (!sql.includes('storage.foldername(name)')) throw new Error('storage policy must bind object path to tenant');
if (!sql.includes('current_company_id()::text')) throw new Error('storage policy must derive tenant server-side');
if (!sql.includes('auth.uid()::text')) throw new Error('write/delete policy must bind object ownership to auth.uid()');
if (!sql.includes('revoke all on storage.objects from anon')) {
  throw new Error('anonymous storage access must remain fail-closed');
}

// Adversarial guards: reject common cross-tenant/public regressions.
if (/to\s+public/i.test(sql)) throw new Error('storage isolation regression: public role grant detected');
if (/using\s*\(\s*true\s*\)/i.test(sql)) throw new Error('storage isolation regression: unconditional USING(true) detected');
if (/with\s+check\s*\(\s*true\s*\)/i.test(sql)) throw new Error('storage isolation regression: unconditional WITH CHECK(true) detected');

console.log('storage tenant isolation contract: PASS');
