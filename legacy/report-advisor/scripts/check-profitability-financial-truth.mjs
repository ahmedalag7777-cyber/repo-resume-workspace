import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20260827161000_profitability_financial_truth.sql','utf8');
const adapter=fs.readFileSync('src/lib/dashboard-canonical.ts','utf8');
const page=fs.readFileSync('src/pages/ProfitabilityReportCanonicalPage.tsx','utf8');
const app=fs.readFileSync('src/App.tsx','utf8');
for(const token of ['public.current_company_id()','sum(s.total - s.tax_amount)','sum(si.quantity * si.cost_price)','status NOT IN (\'cancelled\',\'void\')','INSUFFICIENT_DATA','CURRENCY_MISMATCH','REVOKE ALL ON FUNCTION public.get_profitability_snapshot(date) FROM PUBLIC','GRANT EXECUTE ON FUNCTION public.get_profitability_snapshot(date) TO authenticated'])if(!sql.includes(token))throw new Error(`profitability invariant missing: ${token}`);
for(const token of ["supabase.rpc('get_profitability_snapshot'",'fetchProfitabilitySnapshot','ProfitabilityReportCanonicalPage'])if(!(adapter+page+app).includes(token))throw new Error(`profitability consumer missing: ${token}`);
if(/sum\(i\.quantity \* i\.cost_price\)/.test(sql))throw new Error('invalid profitability aggregate alias detected');
console.log('Profitability Financial Truth Contract: PASS');
