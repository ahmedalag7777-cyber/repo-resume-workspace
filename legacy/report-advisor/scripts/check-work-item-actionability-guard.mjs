import fs from 'node:fs';

const migration = 'supabase/migrations/20260830190000_reinforce_work_item_actionability_guard.sql';
const sql = fs.readFileSync(migration, 'utf8');

const required = [
  "IF v_status <> 'IN_PROGRESS' THEN",
  "RAISE EXCEPTION 'WORK_ITEM_NOT_EXECUTABLE'",
  "status = 'IN_PROGRESS'",
  "status = 'APPROVED'",
  "RAISE EXCEPTION 'DECISION_STATE_CHANGED'",
  "SECURITY DEFINER",
  "SET search_path = public",
];

for (const needle of required) {
  if (!sql.includes(needle)) {
    console.error(`WORK_ITEM_ACTIONABILITY_GUARD_FAIL: missing ${needle}`);
    process.exit(1);
  }
}

if (sql.includes("IF v_status = 'COMPLETED' THEN")) {
  console.error('WORK_ITEM_ACTIONABILITY_GUARD_FAIL: terminal-only check regressed');
  process.exit(1);
}

console.log('WORK_ITEM_ACTIONABILITY_GUARD_PASS');
