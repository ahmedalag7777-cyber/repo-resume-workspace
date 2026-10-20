import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260825110000_governance_intelligence_hardening.sql'), 'utf8');
const runtimeGate = fs.readFileSync(path.join(root, 'supabase/migrations/20260825164000_decision_evidence_runtime_gate.sql'), 'utf8');

const required = [
  'business_risk_budgets', 'decision_graph_nodes', 'decision_graph_edges',
  'anomaly_correlations', 'human_override_feedback', 'intelligence_quality_scores',
  'governed_scenarios', 'REVOKE ALL ON TABLE', 'company_id=public.current_company_id()',
  "status='active'", 'expires_at', 'consumed_risk < b.max_risk', 'is_continuous_trust_healthy',
];
const runtimeRequired = [
  'JOIN business_risk_budgets', "d.status='APPROVED'", 'd.confidence IS NOT NULL',
  "jsonb_typeof(d.evidence->'source_refs')='array'", 'jsonb_array_length(d.evidence->\'source_refs\') > 0',
  "jsonb_typeof(d.evidence->'observed_at')='string'", 'r.risk_budget IS NOT NULL',
  'JOIN business_state_snapshots', 's.quality_score >= 0.80',
];
const missing = required.filter(x => !sql.includes(x));
const runtimeMissing = runtimeRequired.filter(x => !runtimeGate.includes(x));
if (missing.length || runtimeMissing.length) {
  throw new Error(`Governance intelligence blockers:\n${[...missing, ...runtimeMissing].join('\n')}`);
}
console.log('Governance intelligence hardening contract: PASS');
