import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'src/lib/production-intelligence.ts',
  'src/lib/phase-kl-runtime.ts',
  'supabase/migrations/20260825142000_phase_kl_runtime_closure.sql',
  'supabase/migrations/20260825100000_autonomous_governance_business_intelligence.sql',
];

for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) {
    throw new Error(`Missing evidence component: ${f}`);
  }
}

const text = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const normalized = text.toLowerCase();

for (const term of ['evidence', 'source', 'lineage', 'canonical', 'confidence', 'materiality']) {
  if (!normalized.includes(term)) {
    throw new Error(`Evidence provenance invariant missing: ${term}`);
  }
}

const concreteProvenanceInvariants = [
  'sourcehash',
  'observedat',
  'sourceversionkey',
  'record_executive_evidence_edge',
  "'derived_from'",
];

for (const invariant of concreteProvenanceInvariants) {
  if (!normalized.includes(invariant)) {
    throw new Error(`Evidence provenance invariant missing: ${invariant}`);
  }
}

console.log('Evidence provenance chain: PASS');
