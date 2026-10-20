import fs from 'node:fs';

const migrationFiles = fs.readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .sort();
const migration = migrationFiles
  .map((name) => fs.readFileSync(`supabase/migrations/${name}`, 'utf8'))
  .join('\n');
const runtime = fs.readFileSync('src/lib/decision-automation/vertical-slice-runtime.ts','utf8');
const evidence = fs.readFileSync('src/lib/decision-automation/runtime-evidence.ts','utf8');

const mustContain = [
  ['canonical work start RPC', 'start_decision_work_item'],
  ['canonical action receipt RPC', 'create_decision_action_receipt'],
  ['approval guard for work', "d.status='APPROVED'"],
  ['approval guard for action', "w.status='IN_PROGRESS'"],
  ['idempotency uniqueness', /UNIQUE\s*\(\s*company_id\s*,\s*idempotency_key\s*\)/i],
  ['actor enforcement', 'auth.uid() IS NULL'],
  ['evidence audit IDs', 'auditIds'],
  ['deterministic outcome delta', 'return actual - expected'],
];
const haystack = [migration, runtime, evidence].join('\n');
for (const [label, token] of mustContain) {
  const matched = token instanceof RegExp ? token.test(haystack) : haystack.includes(token);
  if (!matched) throw new Error(`${label}: missing ${token}`);
}
if (!/ON CONFLICT\(company_id,idempotency_key\) DO NOTHING/.test(migration)) throw new Error('action receipt is not idempotent');
if (!/IF v_status <> 'OPEN'/.test(migration)) throw new Error('work lifecycle OPEN guard missing');
if (!/IF v_status <> 'IN_PROGRESS'/.test(migration)) throw new Error('completion terminal transition guard missing');
if (!/IF NOT EXISTS \(\s*SELECT 1 FROM public\.business_intelligence_decisions/.test(migration)) throw new Error('approval decision guard missing');
console.log(`runtime lifecycle + idempotency + evidence contract: PASS (${migrationFiles.length} migrations scanned)`);
