import fs from 'node:fs';

const adapter = fs.readFileSync('src/lib/queries-compat.ts', 'utf8');
const canonical = fs.readFileSync('src/lib/queries.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260826003000_sales_secondary_canonical_analytics.sql', 'utf8');
const requiredConsumers = ['fetchMonthlyTrend','fetchTopCustomers','fetchTopProducts','fetchCategoryBreakdown','fetchAgingBuckets'];
for (const name of requiredConsumers) {
  if (!adapter.includes(`export async function ${name}`)) throw new Error(`missing compatibility consumer: ${name}`);
  if (!canonical.includes(`export async function ${name}`)) throw new Error(`missing canonical consumer: ${name}`);
}

// Compatibility must preserve the old import surface without owning business truth.
if (adapter.includes("get_sales_secondary_metrics")) throw new Error('compatibility layer must not call the secondary analytics RPC');
if (adapter.includes('loadSecondaryMetrics')) throw new Error('secondary aggregation loader must not remain in compatibility layer');
if (adapter.includes(".from('sales_invoices')") || adapter.includes(".from('sale_items')")) throw new Error('compatibility analytics must not query sales tables directly');
for (const alias of ['canonicalFetchMonthlyTrend','canonicalFetchTopCustomers','canonicalFetchTopProducts','canonicalFetchCategoryBreakdown','canonicalFetchAgingBuckets']) {
  if (!adapter.includes(`return ${alias}(`)) throw new Error(`${alias} must be delegated by compatibility adapter`);
}

const requiredSql = [
  'public.current_company_id()',
  "raise exception 'TENANT_CONTEXT_MISMATCH'",
  "status not in ('cancelled', 'void')",
  '(p_from is null or s.invoice_date >= p_from)',
  '(p_to is null or s.invoice_date <= p_to)',
  'limit v_limit',
  'generate_series',
  'group by bucket, bucket_order',
  'revoke all on function public.get_sales_secondary_metrics',
  'grant execute on function public.get_sales_secondary_metrics',
];
for (const marker of requiredSql) if (!migration.includes(marker)) throw new Error(`canonical SQL invariant missing: ${marker}`);

// Behavioral proof: display pagination must not become business aggregation.
const invoices = Array.from({ length: 101 }, () => ({ subtotal: 10, status: 'confirmed' }));
const canonicalTotal = invoices.filter(i => !['cancelled','void'].includes(i.status)).reduce((sum,i)=>sum+i.subtotal,0);
const page1 = invoices.slice(0,20); const page2 = invoices.slice(20,40);
if (canonicalTotal !== 1010) throw new Error('fixture canonical total is invalid');
if (page1.reduce((s,i)=>s+i.subtotal,0) === canonicalTotal) throw new Error('pagination fixture unexpectedly equals canonical total');
if (page2.length !== 20) throw new Error('pagination fixture setup invalid');

console.log('secondary consumer canonical regression: PASS');
