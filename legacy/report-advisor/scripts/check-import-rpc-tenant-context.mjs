import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const migrations = files.map((file) => ({ file, text: fs.readFileSync(path.join(dir, file), 'utf8') }));
const canonical = migrations.find(({ file }) => file.includes('import_rpc_canonical_tenant'));
if (!canonical) throw new Error('Canonical tenant-aware import RPC migration is missing');

const text = canonical.text;
for (const marker of [
  'public.current_company_id()',
  'TENANT_CONTEXT_REQUIRED',
  'TENANT_CONTEXT_MISMATCH',
  'IMPORT_JOB_NOT_FOUND_OR_FORBIDDEN',
  'REVOKE ALL ON FUNCTION public.import_create_job',
  'GRANT EXECUTE ON FUNCTION public.import_create_job',
]) {
  if (!text.includes(marker)) throw new Error(`Import RPC tenant context missing: ${marker}`);
}

for (const fn of ['import_create_job', 'import_update_job_progress', 'import_finish_job', 'import_upsert_product']) {
  const start = text.indexOf(`CREATE OR REPLACE FUNCTION public.${fn}`);
  if (start < 0) throw new Error(`Canonical import RPC missing: ${fn}`);
  const next = text.indexOf('CREATE OR REPLACE FUNCTION public.', start + 1);
  const body = text.slice(start, next < 0 ? text.length : next);

  if (!/v_company_id(?:\s+[a-zA-Z_][a-zA-Z0-9_]*(?:\s*\[\])?)?\s*:=\s*public\.current_company_id\(\)/.test(body)) {
    throw new Error(`Canonical import RPC does not resolve tenant context: ${fn}`);
  }
  if (!body.includes('TENANT_CONTEXT_REQUIRED')) {
    throw new Error(`Canonical import RPC does not fail closed without tenant context: ${fn}`);
  }
}

const createStart = text.indexOf('CREATE OR REPLACE FUNCTION public.import_create_job');
const createBody = text.slice(createStart);
if (!createBody.includes('p_company_id IS DISTINCT FROM v_company_id')) {
  throw new Error('import_create_job must reject mismatched tenant context');
}

function latestDefinition(name) {
  const matches = migrations.filter(({ text: migrationText }) => migrationText.includes(`CREATE OR REPLACE FUNCTION public.${name}`));
  return matches.at(-1);
}

const latestProduct = latestDefinition('import_upsert_product');
if (!latestProduct) throw new Error('Effective import_upsert_product definition is missing');
if (!latestProduct.text.includes('p_is_active boolean')) throw new Error('Effective import_upsert_product must expose p_is_active');
for (const marker of ['NAME_REQUIRED', 'UNIT_REQUIRED', 'COST_PRICE_REQUIRED', 'SELLING_PRICE_REQUIRED', 'MIN_STOCK_REQUIRED', 'REORDER_POINT_REQUIRED', 'IS_ACTIVE_REQUIRED']) {
  if (!latestProduct.text.includes(marker)) throw new Error(`Effective product insert must fail closed when ${marker.replace('_REQUIRED', '').toLowerCase()} is missing`);
}
for (const fabricated of ["coalesce(p_unit, 'قطعة')", 'coalesce(p_cost_price, 0)', 'coalesce(p_selling_price, 0)', 'coalesce(p_min_stock, 0)', 'coalesce(p_reorder_point, 0)']) {
  if (latestProduct.text.includes(fabricated)) throw new Error(`Effective product upsert still fabricates a business default: ${fabricated}`);
}

const latestCustomer = latestDefinition('import_upsert_customer');
if (!latestCustomer) throw new Error('Effective import_upsert_customer definition is missing');
for (const marker of ['CUSTOMER_SEGMENT_REQUIRED', 'CUSTOMER_CREDIT_LIMIT_REQUIRED', 'CUSTOMER_PAYMENT_TERMS_REQUIRED']) {
  if (!latestCustomer.text.includes(marker)) throw new Error(`Effective customer insert must fail closed: ${marker}`);
}

const latestInvoice = latestDefinition('import_upsert_sales_invoice');
if (!latestInvoice) throw new Error('Effective import_upsert_sales_invoice definition is missing');
for (const marker of ['SUBTOTAL_REQUIRED', 'TAX_AMOUNT_REQUIRED', 'TOTAL_REQUIRED', 'PAID_AMOUNT_REQUIRED', 'STATUS_REQUIRED']) {
  if (!latestInvoice.text.includes(marker)) throw new Error(`Effective invoice insert must fail closed: ${marker}`);
}

console.log(`Import RPC tenant context: PASS (canonical=${canonical.file}, product=${latestProduct.file}, customer=${latestCustomer.file}, invoice=${latestInvoice.file})`);
