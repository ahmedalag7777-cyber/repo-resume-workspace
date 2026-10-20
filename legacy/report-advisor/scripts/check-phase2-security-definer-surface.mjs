import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const grep = execFileSync('git', ['grep', '-l', '-i', 'SECURITY DEFINER', '--', 'supabase/migrations'], { encoding: 'utf8' });
const migrationFiles = grep.split('\n').filter(Boolean).sort();
if (migrationFiles.length === 0) throw new Error('No migration surface found for SECURITY DEFINER audit');

const stripSqlComments = (value) => value
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/--[^\n\r]*/g, '');

const functionName = (fn) => fn.replace(/^public\./i, '').replace(/"/g, '');
const escapeRegex = (value) => value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');

const hasServiceRoleOnlyGrant = (sql, fn) => {
  const name = escapeRegex(functionName(fn));
  const revoke = new RegExp(
    'REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+public\\.' + name + '\\s*\\([^;]*?\\)\\s+FROM\\s+(?:PUBLIC|public)\\s*,\\s*anon\\s*,\\s*authenticated\\s*;',
    'i',
  );
  const grant = new RegExp(
    'GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.' + name + '\\s*\\([^;]*?\\)\\s+TO\\s+service_role\\s*;',
    'i',
  );
  return revoke.test(sql) && grant.test(sql);
};

const effectiveDefinitions = new Map();

for (const file of migrationFiles) {
  const sql = stripSqlComments(readFileSync(file, 'utf8'));
  const starts = [...sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([^\s(]+)\s*\([^)]*\)/gi)]
    .map((match) => match.index ?? 0);

  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const end = starts[i + 1] ?? sql.length;
    const block = sql.slice(start, end);
    if (!/SECURITY\s+DEFINER/i.test(block)) continue;

    const fn = block.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([^\s(]+)\s*\(/i)?.[1] ?? '<unknown>';
    effectiveDefinitions.set(functionName(fn).toLowerCase(), { file, fn, block });
  }
}

const failures = [];
for (const { file, fn, block } of effectiveDefinitions.values()) {
  if (!/SET\s+search_path\s*(?:=|TO)\s*'?(?:public|pg_catalog)'?/i.test(block)) {
    failures.push(file + ': ' + fn + ' missing fixed search_path (public or pg_catalog)');
  }

  if (/current_company_id\s*\(\)|auth\.uid\s*\(\)/i.test(block)) continue;

  const fileSql = stripSqlComments(readFileSync(file, 'utf8'));
  if (!hasServiceRoleOnlyGrant(fileSql, fn)) {
    failures.push(file + ': ' + fn + ' missing authenticated tenant/user binding or explicit service_role-only boundary');
  }
}

if (failures.length) {
  console.error('PHASE2_SECURITY_DEFINER_SURFACE_FAILED');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('PHASE2_SECURITY_DEFINER_SURFACE_PASS (effective definitions: ' + effectiveDefinitions.size + '; migrations scanned: ' + migrationFiles.length + ')');
