import fs from 'node:fs';

const path = 'supabase/migrations/20260830013000_harden_recommendation_outcome_provenance.sql';
const sql = fs.readFileSync(path, 'utf8');

const required = [
  "OUTCOME_EVIDENCE_REQUIRED",
  "OUTCOME_VALUES_REQUIRED_FOR_KNOWN_STATUS",
  "DECISION_NOT_FOUND_OR_FORBIDDEN",
  "REVOKE ALL ON FUNCTION public.record_recommendation_outcome",
  "GRANT EXECUTE ON FUNCTION public.record_recommendation_outcome",
];

for (const marker of required) {
  if (!sql.includes(marker)) {
    console.error(`Recommendation outcome provenance regression: missing ${marker}`);
    process.exit(1);
  }
}

console.log('Recommendation outcome provenance regression: PASS');
