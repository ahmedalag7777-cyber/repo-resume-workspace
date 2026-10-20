import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const definitions = [];
for (const file of files) {
  const text = readFileSync(join(dir, file), 'utf8');
  const matches = text.match(/create\s+or\s+replace\s+function\s+public\.current_company_id\s*\(/gi);
  if (matches?.length) {
    definitions.push({ file, count: matches.length });
  }
}

if (definitions.length === 0) {
  console.error('TENANT_RESOLVER_CONTRACT_FAIL: no public.current_company_id() definition found');
  process.exit(1);
}

const totalDefinitions = definitions.reduce((sum, item) => sum + item.count, 0);
const latest = definitions.at(-1);

// Multiple historical CREATE OR REPLACE definitions are allowed. The canonical
// resolver contract is the final migration: active memberships are accepted
// only when a signed-in user resolves to exactly one unambiguous company.
const latestText = readFileSync(join(dir, latest.file), 'utf8');
const required = [
  'company_memberships',
  'is_active',
  'auth.uid()',
];
const missing = required.filter((token) => !latestText.includes(token));

if (missing.length) {
  console.error(`TENANT_RESOLVER_CONTRACT_FAIL: latest resolver migration ${latest.file} is missing: ${missing.join(', ')}`);
  process.exit(1);
}

if (!/SELECT\s+count\(\*\)\s+INTO\s+v_count/i.test(latestText)) {
  console.error(`TENANT_RESOLVER_CONTRACT_FAIL: latest resolver migration ${latest.file} does not count candidate memberships before resolving a tenant`);
  process.exit(1);
}
if (!/IF\s+v_count\s*<>\s*1\s+THEN/i.test(latestText)) {
  console.error(`TENANT_RESOLVER_CONTRACT_FAIL: latest resolver migration ${latest.file} does not fail closed unless exactly one active default membership exists`);
  process.exit(1);
}
if (!/SELECT\s+cm\.company_id[\s\S]*?FROM\s+(?:public\.)?company_memberships\s+cm[\s\S]*?LIMIT\s+1/i.test(latestText)) {
  console.error(`TENANT_RESOLVER_CONTRACT_FAIL: latest resolver migration ${latest.file} does not resolve the single selected company with a bounded SELECT`);
  process.exit(1);
}

console.log(`TENANT_RESOLVER_CONTRACT_PASS: ${totalDefinitions} historical definition(s); final definition: ${latest.file}`);
console.log('TENANT_RESOLVER_CONTRACT_PASS: canonical resolver is active-membership based, requires auth.uid(), and fails closed when no single active membership exists.');
console.log('TENANT_RESOLVER_NOTE: historical CREATE OR REPLACE definitions are preserved; this guard treats migration order as the source of final resolver semantics.');
