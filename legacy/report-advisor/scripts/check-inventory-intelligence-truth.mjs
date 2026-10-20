import fs from 'node:fs';

const page=fs.readFileSync('src/pages/InventoryIntelligencePage.tsx','utf8');
const adapter=fs.readFileSync('src/lib/free-toolbox/inventory-intelligence-canonical.ts','utf8');
const grouped=fs.readFileSync('src/lib/free-toolbox/grouped-report.ts','utf8');
const failures=[];

if(!page.includes('fetchInventoryIntelligenceSource')) failures.push('page must consume canonical inventory intelligence adapter');
for(const token of ["supabase.from('inventory_balances')","supabase.from('products')","supabase.from('alternative_item_group_members')","resolveCurrentCompanyId()"]) {
  if(page.includes(token)) failures.push('page must not own source access: '+token);
}
if(!adapter.includes('resolveCurrentCompanyId()')) failures.push('canonical adapter must resolve tenant context');
if(!adapter.includes(".eq('company_id', companyId)")) failures.push('canonical adapter must bind source reads to tenant');
if(!adapter.includes('Number.isFinite(quantity)')) failures.push('canonical adapter must preserve numeric truth');
if(!adapter.includes('Number.NaN')) failures.push('canonical adapter must preserve unavailable metrics');
if(!grouped.includes('Number.isFinite(r.stockUnits)?Math.max(0,r.stockUnits):0')) failures.push('grouping must define explicit stock semantics');
if(!grouped.includes('Number.isFinite(x.dailyDemand)&&x.dailyDemand>0?x.stockUnits/x.dailyDemand:Number.NaN')) failures.push('days-of-cover must remain unavailable when demand is insufficient');
if(/reduce\s*\(/.test(page)) failures.push('business aggregation must not move into the page consumer');

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('inventory intelligence canonical truth guard: PASS');
