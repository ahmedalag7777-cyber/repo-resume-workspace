import fs from 'node:fs';

const required = {
  'src/lib/entitlements/entitlementPolicy.ts': ['decideEntitlement','MISSING_TENANT','EXPIRED','QUOTA_EXCEEDED','CAPABILITY_DISABLED'],
  'src/lib/entitlements/usageLedger.ts': ['UsageLedger','idempotencyKey','summarize'],
  'src/lib/entitlements/billingLifecycle.ts': ['transitionSubscription','past_due','cancelled','expired','canRetainCustomerData'],
  'src/lib/entitlements/billingWebhook.ts': ['verifyWebhookSignature','verifyWebhookTimestamp','acceptWebhook','replay'],
  'src/lib/report-execution/worker-adapter.ts': ['TrustedReportWorkerAdapter','tenantId','sourceSnapshotId','heartbeat','fail'],
};
for (const [file, tokens] of Object.entries(required)) {
  const s = fs.readFileSync(file, 'utf8');
  for (const token of tokens) if (!s.includes(token)) throw new Error(`${file}: missing ${token}`);
}

const migrationPath = 'supabase/migrations/20260917160000_billing_runtime.sql';
const hardeningPath = 'supabase/migrations/20260917160100_billing_runtime_grant_hardening.sql';
if (!fs.existsSync(migrationPath)) throw new Error(`missing billing runtime migration: ${migrationPath}`);
if (!fs.existsSync(hardeningPath)) throw new Error(`missing billing grant hardening migration: ${hardeningPath}`);
const migration = fs.readFileSync(migrationPath, 'utf8');
const hardening = fs.readFileSync(hardeningPath, 'utf8');
const tables = ['billing_plans','billing_plan_capabilities','billing_subscriptions','billing_usage_events','billing_subscription_events'];
for (const table of tables) {
  if (!new RegExp(`create table if not exists public\\.${table}\\b`, 'i').test(migration)) throw new Error(`billing migration: missing table ${table}`);
  if (!new RegExp(`alter table public\\.${table} enable row level security`, 'i').test(migration)) throw new Error(`billing migration: RLS not enabled on ${table}`);
}
for (const fn of ['billing_current_subscription','billing_check_entitlement','billing_record_usage','billing_set_subscription']) {
  const window = new RegExp(`create or replace function public\\.${fn}\\b[\\s\\S]*?\\$function\\$;`, 'i').exec(migration)?.[0];
  if (!window) throw new Error(`billing migration: missing function ${fn}`);
  if (!/security definer/i.test(window)) throw new Error(`${fn}: SECURITY DEFINER missing`);
  if (!/set search_path\s*=\s*public/i.test(window)) throw new Error(`${fn}: search_path=public missing`);
  if (!/auth\.uid\s*\(\)/i.test(window)) throw new Error(`${fn}: auth.uid binding missing`);
  if (!/current_company_id\s*\(\)/i.test(window)) throw new Error(`${fn}: tenant context binding missing`);
}
const grants = [
  /grant\s+execute\s+on\s+function\s+public\.billing_current_subscription\s*\(\)\s+to\s+authenticated\s*;/i,
  /grant\s+execute\s+on\s+function\s+public\.billing_check_entitlement\s*\(text\s*,\s*numeric\)\s+to\s+authenticated\s*;/i,
  /grant\s+execute\s+on\s+function\s+public\.billing_record_usage\s*\(text\s*,\s*numeric\s*,\s*text\s*,\s*text\s*,\s*jsonb\)\s+to\s+authenticated\s*;/i,
  /grant\s+execute\s+on\s+function\s+public\.billing_set_subscription\s*\(uuid\s*,\s*text\s*,\s*timestamptz\s*,\s*timestamptz\s*,\s*timestamptz\s*,\s*timestamptz\s*,\s*boolean\)\s+to\s+authenticated\s*;/i,
];
for (const grant of grants) if (!grant.test(migration) && !grant.test(hardening)) throw new Error(`billing migration: authenticated EXECUTE grant missing: ${grant}`);
const revokes = [
  /revoke\s+all\s+on\s+function\s+public\.billing_current_subscription\s*\(\)\s+from\s+public\s*;/i,
  /revoke\s+all\s+on\s+function\s+public\.billing_check_entitlement\s*\(text\s*,\s*numeric\)\s+from\s+public\s*;/i,
  /revoke\s+all\s+on\s+function\s+public\.billing_record_usage\s*\(text\s*,\s*numeric\s*,\s*text\s*,\s*text\s*,\s*jsonb\)\s+from\s+public\s*;/i,
  /revoke\s+all\s+on\s+function\s+public\.billing_set_subscription\s*\(uuid\s*,\s*text\s*,\s*timestamptz\s*,\s*timestamptz\s*,\s*timestamptz\s*,\s*timestamptz\s*,\s*boolean\)\s+from\s+public\s*;/i,
];
for (const revoke of revokes) if (!revoke.test(hardening)) throw new Error(`billing grant hardening: PUBLIC EXECUTE revoke missing: ${revoke}`);
if (/grant\s+execute\s+on\s+function[\s\S]*\bto\s+anon\b/i.test(migration + hardening)) throw new Error('billing migration: anonymous EXECUTE grant is forbidden');
if (!/unique\(company_id, period_start, idempotency_key\)/i.test(migration)) throw new Error('billing migration: usage idempotency constraint missing');
if (!/unique\(provider, provider_event_id\)/i.test(migration)) throw new Error('billing migration: provider event idempotency constraint missing');
if (!/BILLING_ADMIN_REQUIRED/i.test(migration)) throw new Error('billing migration: admin subscription mutation guard missing');
if (!/ENTITLEMENT_DENIED/i.test(migration) || !/QUOTA_EXCEEDED/i.test(migration)) throw new Error('billing migration: entitlement/quota fail-closed path missing');
if (!/IDEMPOTENT_REPLAY/i.test(migration) || !/BILLING_IDEMPOTENCY_CONFLICT/i.test(migration)) throw new Error('billing migration: idempotent replay/conflict paths missing');

console.log('entitlements/billing/worker contracts: PASS');
console.log('billing runtime migration: PASS (5 tenant/RLS tables + 4 authenticated SECURITY DEFINER functions + idempotency + quota + admin guard + explicit PUBLIC/anon revokes)');
