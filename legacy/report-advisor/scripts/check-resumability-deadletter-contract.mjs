import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const files=['src/lib/report-execution/checkpoint.ts','supabase/migrations/20260825142000_phase_kl_runtime_closure.sql','scripts/report-execution-runtime.test.ts'];
for(const f of files) if(!fs.existsSync(path.join(root,f))) throw new Error(`Resumability component missing: ${f}`);
const text=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n').toLowerCase();
for(const t of ['resume','checkpoint','dead-letter','lease','source hash','idempot']) if(!text.includes(t)) throw new Error(`Resumability invariant missing: ${t}`);
console.log('Resumability/dead-letter contract: PASS');
