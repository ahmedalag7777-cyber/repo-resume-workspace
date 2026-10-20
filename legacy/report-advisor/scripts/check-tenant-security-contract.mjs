import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const migrations = files.map((file) => ({ file, text: fs.readFileSync(path.join(dir, file), 'utf8') }));

// Migration order is authoritative for CREATE OR REPLACE definitions. Never use
// Array.find() here: an earlier canonical_tenant_membership migration can be
// superseded by a later migration with the same function name.
const resolverCandidates = migrations.filter(({ text }) =>
  /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?current_company_id\s*\(/i.test(text),
);
const resolver = resolverCandidates.at(-1);
const failClosedCandidates = migrations.filter(({ file }) => file.includes('import_rpc_fail_closed'));
if (!resolver) throw new Error('Canonical tenant resolver migration is missing');
if (failClosedCandidates.length === 0) throw new Error('Import RPC fail-closed migration is missing');

// Tenant membership is deliberately evolved across migrations. Schema-level
// evidence belongs to the whole migration chain, while resolver invariants belong
// to the latest CREATE OR REPLACE definition. This avoids false failures when the
// latest resolver only alters an earlier schema primitive.
const schemaMigrations = migrations.filter(({ text }) =>
  /company_memberships/i.test(text),
);
const schemaText = schemaMigrations.map(({ text }) => text).join('\n');
if (!/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?company_memberships/i.test(schemaText)) {
  throw new Error(`Tenant membership base schema is missing from migration history`);
}
if (!/ALTER\s+TABLE\s+company_memberships/i.test(schemaText)) {
  throw new Error(`Tenant membership schema evolution is missing from migration history`);
}

const schemaMarkers = [
  'REFERENCES auth.users(id)',
  'company_memberships',
  'is_active',
  'is_default',
];
for (const marker of schemaMarkers) {
  if (!schemaText.includes(marker)) {
    throw new Error(`Tenant membership schema contract missing from migration history: ${marker}`);
  }
}

// Resolver-specific invariants must be present in the latest definition.
if (!resolver.text.includes('auth.uid()')) {
  throw new Error(`Tenant resolver ${resolver.file} is missing auth.uid()`);
}
if (!/cm\.user_id\s*=\s*auth\.uid\(\)[\s\S]*?cm\.is_active\s*=\s*true[\s\S]*?cm\.is_default\s*=\s*true/i.test(resolver.text)) {
  throw new Error(`Latest tenant resolver ${resolver.file} does not enforce active default membership for auth.uid()`);
}
if (!/SELECT\s+cm\.company_id[\s\S]*?FROM\s+(?:public\.)?company_memberships\s+cm[\s\S]*?LIMIT\s+1/i.test(resolver.text)) {
  throw new Error(`Latest tenant resolver ${resolver.file} is missing a bounded single-tenant SELECT`);
}

if (/CREATE POLICY[^;]+TO\s+anon[^;]+USING\s*\(\s*true\s*\)/is.test(resolver.text)) {
  throw new Error('Permissive anonymous tenant policy detected in canonical resolver');
}
if (/CREATE POLICY[^;]+TO\s+authenticated[^;]+USING\s*\(\s*true\s*\)/is.test(resolver.text)) {
  throw new Error('Permissive authenticated tenant policy detected in canonical resolver');
}

const failClosed = failClosedCandidates.find(({ text }) => text.includes('IMPORT_RPC_TENANT_AUTH_NOT_CONFIGURED'));
if (!failClosed) {
  const names = failClosedCandidates.map(({ file }) => file).join(', ');
  throw new Error(`Import RPC fail-closed contract missing from matching migrations: ${names}`);
}

console.log(`Tenant security contract: PASS (latest-resolver=${resolver.file}, historical-resolver-definitions=${resolverCandidates.length}, fail-closed=${failClosed.file})`);
