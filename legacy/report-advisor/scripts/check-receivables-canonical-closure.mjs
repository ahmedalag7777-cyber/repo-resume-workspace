import fs from 'node:fs';

const files = {
  queries: fs.readFileSync('src/lib/queries.ts', 'utf8'),
  page: fs.readFileSync('src/pages/ReceivablesReportCanonicalPage.tsx', 'utf8'),
  app: fs.readFileSync('src/App.tsx', 'utf8'),
  migration: fs.readFileSync('supabase/migrations/20260827160000_receivables_authoritative_page.sql', 'utf8'),
};

const required = {
  queries: ["supabase.rpc('get_receivables_report_page'", 'export async function fetchReceivablesReportPage', "supabase.rpc('get_receivables_export_rows'", 'export async function fetchReceivablesExportRows'],
  page: ['fetchReceivablesReportPage', 'fetchReceivablesExportRows', 'ReceivablesReportCanonicalPage'],
  app: ["import('@/pages/ReceivablesReportCanonicalPage')", '<Route path="/reports/receivables" element={<ReceivablesReportPage />} />'],
  migration: ['public.current_company_id()', 'SECURITY DEFINER', 'SET search_path = public', 'REVOKE ALL ON FUNCTION public.get_receivables_report_page(integer, integer) FROM PUBLIC', 'REVOKE ALL ON FUNCTION public.get_receivables_report_page(integer, integer) FROM anon', 'GRANT EXECUTE ON FUNCTION public.get_receivables_report_page(integer, integer) TO authenticated', 'OFFSET v_page * v_page_size', 'LIMIT v_page_size'],
};

for (const [name, tokens] of Object.entries(required)) {
  for (const token of tokens) {
    if (!files[name].includes(token)) throw new Error(`receivables canonical guard: ${name} missing token: ${token}`);
  }
}
if (files.page.includes('fetchSalesInvoices(0,50)') || /\.reduce\(/.test(files.page)) throw new Error('receivables canonical guard: browser aggregation detected');
console.log('Receivables canonical closure: PASS');
