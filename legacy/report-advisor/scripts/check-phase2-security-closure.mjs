import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const companiesMigration = path.join(root, 'supabase', 'migrations', '20260830170000_companies_tenant_boundary_hardening.sql');
const tenantAuthorityMigration = path.join(root, 'supabase', 'migrations', '20260830172000_current_company_id_execute_contract.sql');
const text = fs.readFileSync(companiesMigration, 'utf8');
const tenantAuthority = fs.readFileSync(tenantAuthorityMigration, 'utf8');

const stripSqlComments = (sql) => sql
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/--[^\n\r]*/g, '');

const sql = stripSqlComments(text);
const authoritySql = stripSqlComments(tenantAuthority);

const required = [
  /ALTER\s+TABLE\s+public\.companies\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
  /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.companies\s+FROM\s+anon/i,
  /REVOKE\s+INSERT\s*,\s*UPDATE\s*,\s*DELETE\s*,\s*TRUNCATE\s*,\s*REFERENCES\s*,\s*TRIGGER\s+ON\s+TABLE\s+public\.companies\s+FROM\s+authenticated/i,
  /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.companies\s+TO\s+authenticated/i,
  /CREATE\s+POLICY\s+companies_select_current_tenant/i,
  /FOR\s+SELECT\s+TO\s+authenticated/i,
  /membership\.company_id\s*=\s*companies\.id/i,
  /membership\.user_id\s*=\s*auth\.uid\(\)/i,
];

for (const pattern of required) {
  if (!pattern.test(sql)) throw new Error(`Phase 2 security contract missing: ${pattern}`);
}

for (const pattern of [
  /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.current_company_id\(\)\s+FROM\s+anon/i,
  /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.current_company_id\(\)\s+TO\s+authenticated/i,
]) {
  if (!pattern.test(authoritySql)) throw new Error(`Canonical tenant authority contract missing: ${pattern}`);
}

if (/CREATE\s+POLICY[^;]+TO\s+anon[^;]+USING\s*\(\s*true\s*\)/is.test(sql)) {
  throw new Error('Permissive anonymous companies policy detected');
}
if (/CREATE\s+POLICY[^;]+TO\s+authenticated[^;]+USING\s*\(\s*true\s*\)/is.test(sql)) {
  throw new Error('Permissive authenticated companies policy detected');
}
if (/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE|TRUNCATE)\s+ON\s+TABLE\s+public\.companies\s+TO\s+(?:anon|authenticated)/i.test(sql)) {
  throw new Error('Client mutation grant detected for companies');
}
if (/current_company_id\s*\(\)/i.test(sql)) {
  throw new Error('Companies RLS policy must not depend on EXECUTE privilege of current_company_id()');
}

// Adversarial test: comments that look like grants/policies must not satisfy the gate.
const commentDecoy = '-- GRANT ALL ON TABLE public.companies TO authenticated;\n-- CREATE POLICY fake ON public.companies FOR ALL TO authenticated USING (true);';
const strippedDecoy = stripSqlComments(commentDecoy);
if (/GRANT\s+ALL\s+ON\s+TABLE\s+public\.companies/i.test(strippedDecoy)) {
  throw new Error('Comment-stripping adversarial check failed');
}

console.log('Phase 2 security closure: PASS');
