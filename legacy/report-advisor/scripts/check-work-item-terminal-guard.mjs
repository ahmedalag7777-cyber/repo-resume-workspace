import fs from 'node:fs';
const migration = fs.readFileSync('supabase/migrations/20260830173000_harden_work_item_terminal_transition.sql','utf8');
const required = ["IF v_status = 'COMPLETED'", "RAISE EXCEPTION 'WORK_ITEM_ALREADY_COMPLETED'", "IF v_status NOT IN ('OPEN','IN_PROGRESS')", "RAISE EXCEPTION 'WORK_ITEM_NOT_ACTIONABLE'", "REVOKE EXECUTE ON FUNCTION public.complete_decision_work_item(uuid,numeric,jsonb) FROM PUBLIC, anon"];
for (const token of required) if (!migration.includes(token)) throw new Error(`WORK_ITEM_TERMINAL_GUARD_MISSING: ${token}`);
if (migration.includes("IF v_status NOT IN ('OPEN','IN_PROGRESS','BLOCKED','CANCELLED')")) throw new Error('WORK_ITEM_TERMINAL_GUARD_BYPASS');
console.log('WORK_ITEM_TERMINAL_GUARD_PASS');
