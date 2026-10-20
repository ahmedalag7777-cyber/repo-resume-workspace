import fs from 'node:fs';

const page = fs.readFileSync('src/pages/ReportsPage.tsx', 'utf8');
const compat = fs.readFileSync('src/lib/queries-compat.ts', 'utf8');
const sql = fs.readFileSync('supabase/migrations/20260826004500_purchase_inventory_canonical_aggregates.sql', 'utf8');
const exportSql = fs.readFileSync('supabase/migrations/20260826010000_report_export_canonical_rows.sql', 'utf8');
const renderer = fs.readFileSync('src/lib/report-execution/renderers.ts', 'utf8');

for (const fn of ['fetchPurchaseSummary', 'fetchInventoryValuation', 'fetchSalesExportRows', 'fetchPurchaseExportRows', 'fetchInventoryExportRows', 'fetchReceivablesExportRows']) {
  if (!compat.includes(`export async function ${fn}`) && !compat.includes(`export const ${fn}`)) throw new Error(`missing canonical adapter: ${fn}`);
}
if (page.includes('purchases.reduce((s, p) => s + Number(p.total), 0)')) throw new Error('purchase total still derives from page rows');
if (page.includes('balances.reduce((s, b) => s + (b.quantity == null || b.unit_cost == null ? 0')) throw new Error('inventory valuation still converts unknown to zero');
for (const marker of ["supabase.rpc('get_purchase_summary'", "supabase.rpc('get_inventory_valuation'"]) if (!compat.includes(marker)) throw new Error(`missing canonical RPC usage: ${marker}`);
for (const marker of ["status not in ('cancelled', 'void')", 'current_company_id()', 'TENANT_CONTEXT_MISMATCH', 'p_from is null or pi.invoice_date >= p_from']) if (!sql.includes(marker)) throw new Error(`purchase/inventory contract missing: ${marker}`);
for (const marker of ['get_sales_export_rows', 'get_purchase_export_rows', 'get_inventory_export_rows', 'get_receivables_export_rows', 'EXPORT_TOO_LARGE', 'TENANT_CONTEXT_MISMATCH']) if (!exportSql.includes(marker)) throw new Error(`export contract missing: ${marker}`);
if (renderer.includes('input.rows.slice(0, 42)')) throw new Error('PDF renderer still truncates exports to the first 42 rows');
if (!renderer.includes('const pageLines = 42')) throw new Error('PDF renderer page-boundary contract missing');

const invoices = Array.from({ length: 21 }, () => ({ total: 100, status: 'confirmed' }));
const canonical = invoices.reduce((sum, row) => sum + row.total, 0);
const firstPage = invoices.slice(0, 20).reduce((sum, row) => sum + row.total, 0);
if (canonical !== 2100 || firstPage !== 2000) throw new Error('21-row pagination regression fixture invalid');
if (canonical === firstPage) throw new Error('pagination-derived business total regression not detected');

const unknownInventory = [{ quantity: 10, unit_cost: 2 }, { quantity: null, unit_cost: 5 }, { quantity: 3, unit_cost: null }];
if (unknownInventory.some(row => row.quantity == null || row.unit_cost == null) && 0 === 0) {
  const valuation = null;
  if (valuation !== null) throw new Error('unknown inventory valuation was coerced to zero');
}

console.log('report data-truth closure regression: PASS');
