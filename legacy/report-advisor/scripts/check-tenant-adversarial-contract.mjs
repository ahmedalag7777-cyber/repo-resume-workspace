import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roots = ['src'];
const ignore = new Set(['node_modules','.git','dist','coverage']);
const allow = new Set([
  'src/lib/types.ts',
  'src/lib/tenantContext.ts',
  'src/lib/file-engine/security.ts',
  'src/lib/analytics/outcome-feedback.ts',
]);

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (ignore.has(entry.name)) continue;
    const file = path.join(dir,entry.name);
    if (entry.isDirectory()) walk(file,out);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(file);
  }
  return out;
}
function stripComments(text){return text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|\s)\/\/.*$/gm,'$1');}
function forbidden(rel,text){
  if (allow.has(rel)) return [];
  const code=stripComments(text);
  const findings=[];
  const rules=[
    [/\b(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(\s*['\"][^'\"]*(?:company|tenant)[^'\"]*['\"]\s*\)/i,'browser storage tenant source'],
    [/\b(?:URLSearchParams|searchParams|location\.search)[\s\S]{0,180}\b(?:companyId|tenantId|company_id|tenant_id)\b/i,'URL/query tenant source'],
    [/\.(?:eq|neq|in|filter)\(\s*['\"](?:company_id|tenant_id)['\"]\s*,\s*(?:selectedCompanyId|selectedTenantId)\s*\)/i,'client-selected tenant filter'],
    [/\b(?:companyId|tenantId)\s*=\s*(?:window\.|document\.|location\.)/i,'browser-global tenant source'],
    [/\b(?:companyId|tenantId|company_id|tenant_id)\s*\?\?\s*['\"][0-9a-f-]{16,}['\"]|\b(?:companyId|tenantId|company_id|tenant_id)\s*\|\|\s*['\"][0-9a-f-]{16,}['\"]/i,'static tenant fallback'],
  ];
  for (const [pattern,label] of rules) if(pattern.test(code)) findings.push(label);
  return findings;
}
const findings=[];
for(const base of roots) for(const file of walk(path.join(root,base))){
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const hits=forbidden(rel,fs.readFileSync(file,'utf8'));
  if(hits.length) findings.push({file:rel,hits});
}

const queriesPath = path.join(root,'src/lib/queries.ts');
if (fs.existsSync(queriesPath)) {
  const queries = fs.readFileSync(queriesPath,'utf8');
  const requiredInvoiceContract = [
    /fetchSalesInvoices[\s\S]*?resolveCurrentCompanyId\(\)/,
    /fetchPurchaseInvoices[\s\S]*?resolveCurrentCompanyId\(\)/,
    /from\('sales_invoices'\)[\s\S]*?eq\('company_id',companyId\)/,
    /from\('purchase_invoices'\)[\s\S]*?eq\('company_id',companyId\)/,
    /order\('invoice_date',\{ascending:false\}\)\.order\('id',\{ascending:true\}\)\.range\(from,to\)/,
  ];
  for (const pattern of requiredInvoiceContract) {
    if (!pattern.test(queries)) findings.push({file:'src/lib/queries.ts',hits:[`invoice tenant contract missing: ${pattern}`]});
  }
}

if(findings.length){
  console.error('Adversarial tenant source-boundary violations detected:');
  for(const f of findings) console.error(`  ${f.file}: ${f.hits.join(', ')}`);
  process.exit(1);
}
console.log('Adversarial tenant source-boundary contract: PASS');
