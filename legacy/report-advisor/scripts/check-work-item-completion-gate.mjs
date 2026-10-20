import fs from 'node:fs';

const sql = fs.readFileSync(
  'supabase/migrations/20260830035000_restore_work_item_in_progress_gate.sql',
  'utf8',
);

if (!/IF\s+v_status\s*<>\s*'IN_PROGRESS'\s+THEN\s+RAISE\s+EXCEPTION\s+'WORK_ITEM_NOT_EXECUTABLE'/i.test(sql)) {
  throw new Error('Completion RPC does not enforce IN_PROGRESS lifecycle state');
}
if (!/d\.status\s*=\s*'APPROVED'/i.test(sql)) {
  throw new Error('Completion RPC lost approved-decision gate');
}
if (!/status\s*=\s*'EXECUTED'/i.test(sql)) {
  throw new Error('Completion RPC lost terminal decision execution transition');
}
console.log('Work-item completion lifecycle gate: PASS');
