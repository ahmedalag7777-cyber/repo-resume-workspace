import fs from 'node:fs';

const adapter = fs.readFileSync('src/lib/queries-compat.ts', 'utf8');
const canonical = fs.readFileSync('src/lib/queries.ts', 'utf8');

const requiredCanonicalDelegates = [
  ['fetchMonthlyTrend', 'canonicalFetchMonthlyTrend'],
  ['fetchTopCustomers', 'canonicalFetchTopCustomers'],
  ['fetchTopProducts', 'canonicalFetchTopProducts'],
  ['fetchCategoryBreakdown', 'canonicalFetchCategoryBreakdown'],
  ['fetchAgingBuckets', 'canonicalFetchAgingBuckets'],
  ['fetchForecasts', 'canonicalFetchForecasts'],
  ['fetchCustomers', 'canonicalFetchCustomers'],
  ['fetchProducts', 'canonicalFetchProducts'],
];

for (const [name, delegate] of requiredCanonicalDelegates) {
  if (!adapter.includes(`export async function ${name}`)) throw new Error(`compatibility export missing: ${name}`);
  if (!canonical.includes(`export async function ${name}`)) throw new Error(`canonical implementation missing: ${name}`);
  if (!adapter.includes(`return ${delegate}(`)) throw new Error(`${name} must delegate to canonical implementation`);
}

// Every compatibility mutation/read that touches tenant-owned tables must resolve the
// authoritative tenant first; callers must never supply a trusted tenant id.
if (!adapter.includes('resolveCurrentCompanyId')) throw new Error('compatibility boundary must use authoritative tenant resolver');
if (!adapter.includes("throw new Error('TENANT_REQUIRED')")) throw new Error('compatibility boundary must fail closed without tenant');

const tenantOwnedDirectPaths = [
  "supabase.from('alerts')",
  "supabase.from('recommendations')",
  "supabase.from('import_jobs')",
];
for (const path of tenantOwnedDirectPaths) {
  if (!adapter.includes(path)) continue;
  if (!adapter.includes('requireTenant()')) throw new Error(`${path} is missing authoritative tenant guard`);
}

// The compatibility export bridge must remain bounded and tenant-authoritative.
if (!adapter.includes("p_max_rows: 10000")) throw new Error('export compatibility bridge must retain bounded row limit');
if (!adapter.includes("const companyId = await requireTenant()")) throw new Error('export/import compatibility paths must resolve tenant before DB access');
if (adapter.includes("supabase.from('sales_invoices')") || adapter.includes("supabase.from('sale_items')")) {
  throw new Error('compatibility boundary must not own sales business aggregation');
}

// The old secondary analytics RPC is a DB-only compatibility candidate, never a browser truth source.
if (adapter.includes('get_sales_secondary_metrics')) throw new Error('compatibility boundary must not call legacy secondary analytics RPC');

console.log('queries-compat boundary regression: PASS');
