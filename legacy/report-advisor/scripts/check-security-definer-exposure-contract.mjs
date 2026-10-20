import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const files = fs.readdirSync(root).filter(name => name.endsWith('.sql')).sort().map(name => path.join(root, name));
const sql = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');

const intendedAuthenticatedSecurityDefiners = [
  'complete_decision_work_item', 'create_decision_work_item', 'create_runtime_decision',
  'create_runtime_recommendation', 'current_company_id', 'decide_approval',
  'link_recommendation_to_decision', 'mark_alert_read', 'notify_decision_work_item',
  'record_decision_outcome', 'record_recommendation_outcome', 'request_decision_approval',
  'clear_cart', 'get_cart', 'remove_cart_item', 'set_cart_item',
];

// Live-only functions are not asserted as repository definitions here. Their
// existence in Staging is a migration-parity concern, not a reason to make a
// static repository contract invent a source definition.
const liveOnlyExpectedSecurityDefiners = ['capture_kpi_evidence_snapshot'];

const criticalOperationalSecurityDefiners = [
  { name: 'current_company_id', requiredTokens: [/auth\.uid\s*\(\)/i, /company_memberships/i, /is_active\s*=\s*true/i, /is_default\s*=\s*true/i], searchPath: 'EMPTY_OR_SAFE' },
  { name: 'fail_report_execution_job', requiredTokens: [/auth\.uid\s*\(\)/i, /current_company_id\s*\(\)/i, /lease_token/i, /company_id\s*=\s*p_company_id/i, /UPDATE\s+public\.report_execution_jobs/i], searchPath: 'PUBLIC' },
  { name: 'retry_report_execution_job', requiredTokens: [/auth\.uid\s*\(\)/i, /current_company_id\s*\(\)/i, /report_execution_jobs/i, /company_id\s*=\s*p_company_id/i, /status\s*=\s*\x27failed\x27/i], searchPath: 'EMPTY_OR_SAFE' },
];

const failures = [];

function getFunctionWindow(name) {
  const definitionPattern = new RegExp(`CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+(?:public\\.)?${name}\\s*\\(`, 'gi');
  let lastIndex = -1;
  let match;
  while ((match = definitionPattern.exec(sql)) !== null) lastIndex = match.index;
  if (lastIndex < 0) return null;
  const nextFunction = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?/gi;
  nextFunction.lastIndex = lastIndex + 1;
  const next = nextFunction.exec(sql);
  return sql.slice(lastIndex, next ? next.index : sql.length);
}

function normalizeSearchPath(window) {
  const raw = window.match(/SET\s+search_path\s*(?:TO|=)\s*([^\n;]+)/i)?.[1];
  if (!raw) return null;
  return raw.trim().toLowerCase().replaceAll('"', '').replaceAll("'", '').replace(/\s+/g, '');
}

function hasSafeSearchPath(window, mode) {
  const normalized = normalizeSearchPath(window);
  if (!normalized) return false;
  if (mode === 'EMPTY_OR_SAFE') return normalized === '' || normalized === 'public' || normalized === 'public,pg_catalog';
  return normalized === 'public' || normalized === 'public,pg_catalog';
}

function assertAuthenticatedOnly(name) {
  const authenticatedGrant = new RegExp(`GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(?:public\\.)?${name}\\s*\\([^;]*?\\)\\s+TO\\s+authenticated\\s*;`, 'i');
  if (!authenticatedGrant.test(sql)) failures.push(`${name}: authenticated EXECUTE grant not found`);
  const anonGrant = new RegExp(`GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(?:public\\.)?${name}\\s*\\([^;]*?\\)\\s+TO\\s+anon\\s*;`, 'i');
  if (anonGrant.test(sql)) failures.push(`${name}: SECURITY DEFINER function must not be executable by anon`);
}

for (const name of intendedAuthenticatedSecurityDefiners) {
  const window = getFunctionWindow(name);
  if (!window) { failures.push(`${name}: latest repository definition not found`); continue; }
  if (!/SECURITY\s+DEFINER/i.test(window)) failures.push(`${name}: SECURITY DEFINER missing in latest repository definition`);
  if (!hasSafeSearchPath(window, 'EMPTY_OR_SAFE')) failures.push(`${name}: explicit safe search_path missing in latest repository definition`);
  if (name !== 'current_company_id' && !/(auth\.uid\s*\(\)|current_company_id\s*\(\))/i.test(window)) failures.push(`${name}: caller/tenant binding missing in latest repository definition`);
  if (name === 'current_company_id' && !/auth\.uid\s*\(\)/i.test(window)) failures.push('current_company_id: auth.uid() binding missing in latest repository definition');
  assertAuthenticatedOnly(name);
}

for (const check of criticalOperationalSecurityDefiners) {
  const window = getFunctionWindow(check.name);
  if (!window) { failures.push(`${check.name}: critical operational definition not found`); continue; }
  if (!/SECURITY\s+DEFINER/i.test(window)) failures.push(`${check.name}: SECURITY DEFINER missing`);
  if (!hasSafeSearchPath(window, check.searchPath)) failures.push(`${check.name}: safe explicit search_path missing`);
  for (const token of check.requiredTokens) if (!token.test(window)) failures.push(`${check.name}: required security/runtime invariant missing: ${token}`);
  assertAuthenticatedOnly(check.name);
}

if (failures.length) {
  console.error('Security-definer exposure contract: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Security-definer exposure contract: PASS (${intendedAuthenticatedSecurityDefiners.length} intentional authenticated repository functions + ${criticalOperationalSecurityDefiners.length} critical operational repository functions)`);
console.log(`LIVE_ONLY_SECURITY_DEFINER_NOT_ASSERTED=${liveOnlyExpectedSecurityDefiners.join(',')}`);
console.log('Migration parity for any live-only function remains a separate fail-closed gate.');
