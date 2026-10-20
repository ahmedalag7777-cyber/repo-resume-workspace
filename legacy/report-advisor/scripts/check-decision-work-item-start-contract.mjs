import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260831013000_start_decision_work_item.sql', 'utf8');
const exposureFix = fs.readFileSync('supabase/migrations/20260831013100_restrict_start_decision_work_item_execute.sql', 'utf8');
const runtime = fs.readFileSync('src/lib/decision-automation/vertical-slice-runtime.ts', 'utf8');

const required = [
  [/CREATE OR REPLACE FUNCTION public\.start_decision_work_item\(/i, 'start RPC exists'],
  [/SECURITY DEFINER/i, 'RPC is SECURITY DEFINER'],
  [/SET search_path\s*=\s*public/i, 'RPC pins search_path'],
  [/auth\.uid\(\)/i, 'RPC binds caller identity'],
  [/current_company_id\(\)/i, 'RPC binds tenant context'],
  [/d\.status\s*=\s*'APPROVED'/i, 'RPC requires approved decision'],
  [/v_status\s*<>\s*'OPEN'/i, 'RPC rejects non-OPEN states'],
  [/v_assignee\s+IS NOT NULL\s+AND\s+v_assignee\s+<>\s+v_user/i, 'RPC enforces assignee'],
  [/status\s*=\s*'IN_PROGRESS'/i, 'RPC enters IN_PROGRESS'],
  [/GRANT EXECUTE ON FUNCTION public\.start_decision_work_item\(uuid\) TO authenticated/i, 'authenticated EXECUTE granted'],
];

for (const [pattern, label] of required) {
  if (!pattern.test(migration)) throw new Error(`Start work-item contract missing: ${label}`);
}

for (const [pattern, label] of [
  [/REVOKE EXECUTE ON FUNCTION public\.start_decision_work_item\(uuid\) FROM PUBLIC/i, 'PUBLIC EXECUTE revoked'],
  [/REVOKE EXECUTE ON FUNCTION public\.start_decision_work_item\(uuid\) FROM anon/i, 'anon EXECUTE revoked'],
  [/GRANT EXECUTE ON FUNCTION public\.start_decision_work_item\(uuid\) TO authenticated/i, 'authenticated EXECUTE retained'],
]) {
  if (!pattern.test(exposureFix)) throw new Error(`Start work-item exposure contract missing: ${label}`);
}

if (!/export async function startRuntimeWorkItem\(workItemId: string\)/.test(runtime)) {
  throw new Error('Runtime wrapper missing startRuntimeWorkItem');
}
if (!/supabase\.rpc\('start_decision_work_item'/.test(runtime)) {
  throw new Error('Runtime wrapper does not call start_decision_work_item');
}

console.log('Decision work-item start contract: PASS');
console.log('Coverage: tenant context, approved decision, OPEN-only transition, assignee enforcement, authenticated-only RPC exposure, runtime wrapper');
