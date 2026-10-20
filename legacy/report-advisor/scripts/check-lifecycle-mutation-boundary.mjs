import fs from 'node:fs';
import assert from 'node:assert/strict';

const files = ['src/lib/queries.ts', 'src/lib/queries-compat.ts'];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes("rpc('mark_alert_read'"), file + ': canonical mark_alert_read RPC missing');
  assert.ok(source.includes("rpc('update_recommendation_status'"), file + ': canonical update_recommendation_status RPC missing');
  assert.ok(!source.includes("from('alerts').update"), file + ': direct alerts UPDATE bypass detected');
  assert.ok(!source.includes("from('recommendations').update"), file + ': direct recommendations UPDATE bypass detected');
}
console.log('lifecycle mutation boundary: PASS');
