import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260903160000_restore_report_execution_dead_letter_terminal_transition.sql'),
  'utf8',
);

assert.match(
  migration,
  /status\s*=\s*CASE\s+WHEN\s+attempt\s*>=\s*max_attempts\s+THEN\s+'dead_letter'\s+ELSE\s+'failed'/is,
  'terminal worker failure must transition to dead_letter at max_attempts',
);
assert.match(
  migration,
  /last_error\s*=\s*p_error/is,
  'dead-letter transition must preserve structured failure evidence',
);
assert.match(
  migration,
  /jsonb_typeof\(p_error\)\s*<>\s*'object'/is,
  'failure transition must reject unstructured error payloads',
);
assert.match(
  migration,
  /SET\s+search_path\s+TO\s+'pg_catalog'/is,
  'security-definer worker function must retain locked search_path',
);
assert.match(
  migration,
  /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.fail_report_execution_job\(uuid,\s*text,\s*jsonb\)\s+FROM\s+public,\s*anon/is,
  'worker failure RPC must not be callable by public or anon',
);

console.log('report-execution worker DB terminal contract: PASS');
