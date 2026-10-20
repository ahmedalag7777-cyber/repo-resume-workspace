import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260830240000_fix_empty_quality_truth.sql', 'utf8');
const core = fs.readFileSync('src/lib/data-quality-snapshot-core.ts', 'utf8');
const adapter = fs.readFileSync('src/lib/data-quality-snapshot-runtime.ts', 'utf8');
const page = fs.readFileSync('src/pages/DataQualitySnapshotPage.tsx', 'utf8');
const legacyAdapter = fs.readFileSync('src/lib/data-quality-snapshot.ts', 'utf8');

for (const pattern of [
  /status:\s*'OK'\s*\|\s*'EMPTY'/,
  /typeof snapshot\.tenant_id !== 'string'/,
  /Number\.isFinite\(entity\.total\)/,
  /Number\.isFinite\(entity\.issues\)/,
  /Number\.isFinite\(entity\.score\)/,
  /entity\.issues < 0/,
  /entity\.score > 100/,
  /Number\.isFinite\(issue\.count\)/,
  /issue\.count < 0/,
  /DATA_QUALITY_EMPTY_SNAPSHOT_INCONSISTENT/,
]) if (!pattern.test(core)) throw new Error(`Missing pure validator truth invariant: ${pattern}`);

for (const pattern of [
  /supabase\.rpc\('get_data_quality_snapshot'\)/,
  /validateDataQualitySnapshot/,
  /data-quality-snapshot-core/,
]) if (!pattern.test(adapter)) throw new Error(`Missing runtime adapter boundary invariant: ${pattern}`);

for (const pattern of [
  /customer_total\+product_total\+invoice_total\+balance_total=0 then 'EMPTY'/,
  /'entities',case when customer_total\+product_total\+invoice_total\+balance_total=0 then '\[\]'::jsonb/,
  /'issues',case when customer_total\+product_total\+invoice_total\+balance_total=0 then '\[\]'::jsonb/,
  /greatest\(0,least\(100,round/,
  /SECURITY INVOKER/,
  /SET search_path = public/,
]) if (!pattern.test(migration)) throw new Error(`Missing canonical EMPTY/security invariant: ${pattern}`);

for (const pattern of [
  /totalRecords === 0 \? 0/,
  /Math\.max\(0, Math\.min\(100/,
  /totalRecords===0\?'لا توجد بيانات تجارية بعد؛ النتيجة EMPTY وليست نجاح جودة بيانات\.'/,
]) if (!pattern.test(page)) throw new Error(`Missing UI truth invariant: ${pattern}`);

if (!/from ['"]\.\/data-quality-snapshot-runtime['"]/.test(legacyAdapter)) throw new Error('Legacy data-quality adapter is not delegated to validated runtime');

console.log('Data Quality empty-runtime contract: PASS');
