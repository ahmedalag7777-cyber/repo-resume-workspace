import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const migration = fs.readdirSync(path.join(root,'supabase','migrations')).find((n)=>n.includes('phase_l_production_autonomy'));
if (!migration) throw new Error('Phase L migration missing');
const sql = fs.readFileSync(path.join(root,'supabase','migrations',migration),'utf8');
for (const token of ['control_plane_health_snapshots','executive_evidence_graph','autonomy_certification_evidence','can_run_phase_l_autonomy','current_company_id()','is_continuous_trust_healthy']) if (!sql.includes(token)) throw new Error(`Phase L contract missing: ${token}`);
for (const token of ['REVOKE ALL ON TABLE','CREATE POLICY']) if (!sql.includes(token)) throw new Error(`Phase L security contract missing: ${token}`);
console.log('Phase L runtime contract: PASS');
