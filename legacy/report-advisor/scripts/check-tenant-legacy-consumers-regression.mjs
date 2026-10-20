import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tenant-legacy-regression-'));
const checker = path.join(root, 'scripts', 'check-tenant-legacy-consumers.mjs');
fs.mkdirSync(path.dirname(checker), { recursive: true });
const sourceChecker = fs.readFileSync(path.join(process.cwd(), 'scripts/check-tenant-legacy-consumers.mjs'), 'utf8');
fs.writeFileSync(checker, sourceChecker);
fs.mkdirSync(path.join(root, 'src/pages'), { recursive: true });

const canonical = `
import { resolveCurrentCompanyId } from '@/lib/supabase';
const requireTenant = async () => { const tenantId = await resolveCurrentCompanyId(); if (!tenantId) throw new Error('tenant required'); return tenantId; };
export async function save() {
  const companyId = await requireTenant();
  return supabase.rpc('create_alternative_item_group', { p_company_id: companyId, p_name: 'A' });
}
`;
fs.writeFileSync(path.join(root, 'src/pages/CanonicalRpc.tsx'), canonical);

let result = spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
if (result.status !== 0) {
  console.error('FAIL: canonical tenant-authoritative RPC payload was rejected.');
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

fs.writeFileSync(path.join(root, 'src/pages/Unsafe.tsx'), `
const selectedCompanyId = browserSelectedCompany;
supabase.from('items').select('*').eq('company_id', selectedCompanyId);
`);
result = spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
if (result.status === 0) {
  console.error('FAIL: client-selected tenant filter was not detected.');
  process.exit(1);
}

console.log('PASS: tenant legacy consumer regression protects canonical RPC payloads and still rejects client-selected tenant filters.');
