import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const migration = fs.readFileSync(path.join(root,'supabase/migrations/20260825140000_phase_l_runtime_cockpit.sql'),'utf8');
const closure = fs.readFileSync(path.join(root,'supabase/migrations/20260825142000_phase_kl_runtime_closure.sql'),'utf8');
const runtime = fs.readFileSync(path.join(root,'src/lib/phase-kl-runtime.ts'),'utf8');
for (const token of ['control_plane_health_snapshots','executive_evidence_graph','autonomy_certification_evidence','compute_control_plane_health','can_enter_phase_l_autonomy','REVOKE ALL ON TABLE','WITH CHECK','SECURITY DEFINER SET search_path=public']) {
  if (!migration.includes(token)) throw new Error(`Phase L contract missing: ${token}`);
}
for (const token of ['advance_report_execution_checkpoint','complete_report_execution_job','fail_report_execution_job','record_control_plane_health','record_executive_evidence_edge','autonomy_runtime_gate','current_company_id()','lease_owner','lease_expires_at']) {
  if (!closure.includes(token)) throw new Error(`K/L runtime closure missing: ${token}`);
}
for (const token of ['advanceRuntime','buildLineage','consolidateRuntime','chooseScenario','prioritizeDecisions','evidenceQuality','canAutonomouslyExecute']) {
  if (!runtime.includes(token)) throw new Error(`K/L runtime orchestration missing: ${token}`);
}
if (closure.includes('GRANT ALL TO anon') || migration.includes('GRANT ALL TO anon')) throw new Error('Unsafe K/L contract: anon grant');
console.log('Phase K/L runtime closure contract: PASS');
