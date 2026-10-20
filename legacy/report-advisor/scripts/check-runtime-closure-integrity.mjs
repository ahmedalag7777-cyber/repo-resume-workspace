import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const checks={
  'src/lib/production-intelligence.ts':['diffRows','consolidateByPrecedence','selectBoundedScenario','rankPortfolio','calibrateConfidence','evaluateAutonomyGate'],
  'src/lib/phase-kl-runtime.ts':['advanceRuntime','buildLineage','consolidateRuntime','chooseScenario','prioritizeDecisions','evidenceQuality','canAutonomouslyExecute'],
  'src/lib/phase-kl-supabase-runtime.ts':['recordHealth','recordEvidenceEdge','autonomyGate'],
  'supabase/migrations/20260825142000_phase_kl_runtime_closure.sql':['advance_report_execution_checkpoint','complete_report_execution_job','fail_report_execution_job','record_control_plane_health','record_executive_evidence_edge','autonomy_runtime_gate'],
  'supabase/migrations/20260825140000_phase_l_runtime_cockpit.sql':['control_plane_health_snapshots','executive_evidence_graph','autonomy_certification_evidence'],
  'supabase/migrations/20260825153000_runtime_lease_hardening.sql':['p_error IS NULL','jsonb_typeof(p_error)','dead_letter','lease_expires_at > now()'],
};
for(const [file,tokens] of Object.entries(checks)){
 const full=path.join(root,file); if(!fs.existsSync(full)) throw new Error(`Runtime closure file missing: ${file}`);
 const text=fs.readFileSync(full,'utf8'); for(const token of tokens) if(!text.includes(token)) throw new Error(`Runtime closure token missing: ${file} -> ${token}`);
}
const intelligence=fs.readFileSync(path.join(root,'src/lib/production-intelligence.ts'),'utf8');
for(const token of ['critical_drift','rollbackVerified','isolationVerified','riskBudgetValid']) if(!intelligence.includes(token)) throw new Error(`Autonomy safety invariant missing: ${token}`);
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260825142000_phase_kl_runtime_closure.sql'),'utf8');
for(const token of ['company_id=public.current_company_id()','lease_owner=p_worker_id','lease_expires_at > now()','status IN']) if(!sql.replace(/\s+/g,'').includes(token.replace(/\s+/g,''))) throw new Error(`Execution safety invariant missing: ${token}`);
if(sql.includes('GRANT ALL TO anon')) throw new Error('Unsafe anonymous grant detected');
console.log('Runtime closure integrity: PASS');
