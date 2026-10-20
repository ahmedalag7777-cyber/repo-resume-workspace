import { readFileSync } from 'node:fs';

const path = 'api/report-execution-enqueue.mjs';
const source = readFileSync(path, 'utf8');

const required = [
  ['POST-only endpoint', "requireMethod(req, res, 'POST')"],
  ['Bearer authentication', "req.headers.authorization"],
  ['Auth user verification', "'/auth/v1/user'"],
  ['database tenant resolution', "'/rest/v1/rpc/current_company_id'"],
  ['server-side service role enqueue', "'/rest/v1/rpc/enqueue_report_execution_job'"],
  ['tenant-bound enqueue', 'p_company_id: companyId'],
  ['idempotent job key', 'report:${reportId}:${idempotencyKey}'],
  ['tenant response fence', 'job.company_id !== companyId'],
];

for (const [label, token] of required) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

if (source.includes('SUPABASE_SERVICE_ROLE_KEY') && source.includes('src/lib/supabase')) {
  throw new Error('Browser Supabase client must not be imported into the server boundary');
}

if (/export\s+default\s+async\s+function\s+handler[\s\S]*?\btenantId\s*=\s*body\./.test(source)) {
  throw new Error('Tenant identity must not be accepted from request body');
}

console.log('Report execution authenticated enqueue boundary: PASS');
