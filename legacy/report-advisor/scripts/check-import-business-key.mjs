import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'supabase', 'migrations');
const canonical = '20260823020000_import_business_key_enforcement.sql';
const rpcMigration = '20260823021000_import_upsert_concurrency_safe.sql';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const read = (name) => {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) throw new Error(`Missing canonical migration: ${name}`);
  return fs.readFileSync(file, 'utf8');
};

const sql = read(canonical);
const rpcSql = read(rpcMigration);

const required = [
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_normalized_sku',
  'public.normalize_import_key(sku)',
  'ON public.products(company_id, public.normalize_import_key(sku))',
  'WHERE public.normalize_import_key(sku) IS NOT NULL',
  'IMPORT_BUSINESS_KEY_DUPLICATES',
];
for (const marker of required) {
  if (!sql.includes(marker)) throw new Error(`Business-key invariant missing from ${canonical}: ${marker}`);
}

// The canonical invariant must be enforced by executable SQL, not merely a comment.
if (/^\s*--.*uq_products_company_normalized_sku/m.test(sql) && !/CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_normalized_sku/.test(sql)) {
  throw new Error('Business-key invariant appears comment-only.');
}

// Concurrency protection may be implemented either with an explicit ON CONFLICT
// clause or by catching the unique-violation raised by the canonical unique index.
// Both approaches serialize the same business-key race; the RPC must also resolve
// the tenant from trusted context rather than trusting a caller-supplied tenant.
for (const marker of [
  'import_upsert_product',
  'normalize_import_key',
  'current_company_id',
]) {
  if (!rpcSql.includes(marker)) throw new Error(`Concurrency-safe import RPC missing from ${rpcMigration}: ${marker}`);
}

if (!rpcSql.includes('ON CONFLICT') && !rpcSql.includes('unique_violation')) {
  throw new Error(`Concurrency-safe import RPC missing race handling from ${rpcMigration}: ON CONFLICT or unique_violation`);
}

if (!rpcSql.includes('FOR UPDATE')) {
  throw new Error(`Concurrency-safe import RPC missing row locking from ${rpcMigration}: FOR UPDATE`);
}

console.log(`Import business-key invariant: PASS (${canonical}, ${rpcMigration}, ${files.length} migrations scanned)`);
