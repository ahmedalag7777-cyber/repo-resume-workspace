import fs from 'node:fs';

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*(?:--|\/\/).*$/gm, '');

const migration = fs.readFileSync(
  'supabase/migrations/20260830062000_revoke_unused_recommendation_status_rpc.sql',
  'utf8',
);
const executableMigration = stripComments(migration);
const revokePattern =
  /^\s*REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.update_recommendation_status\s*\(\s*uuid\s*,\s*text\s*\)\s+FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*;\s*$/im;
if (!revokePattern.test(executableMigration)) {
  throw new Error('Unused recommendation-status RPC remains browser executable');
}

const expectedRpc =
  /supabase\.rpc\(\s*['"]update_recommendation_status['"]\s*,[\s\S]*?p_recommendation_id\s*:\s*id[\s\S]*?p_status\s*:\s*status[\s\S]*?\)/;
const queries = stripComments(
  fs.readFileSync('src/lib/queries.ts', 'utf8'),
);
const compat = stripComments(
  fs.readFileSync('src/lib/queries-compat.ts', 'utf8'),
);
if (!expectedRpc.test(queries) || !expectedRpc.test(compat)) {
  throw new Error(
    'Expected compatibility wrapper missing or changed: update_recommendation_status must pass p_recommendation_id and p_status',
  );
}

console.log('Unused recommendation-status RPC hardening contract: PASS');
