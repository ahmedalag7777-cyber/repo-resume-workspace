import fs from 'node:fs';

const path = 'src/lib/analytics/outcome-feedback.ts';
const source = fs.readFileSync(path, 'utf8');
if (/from\(['"]recommendation_outcomes['"]\)\s*\.upsert\s*\(/.test(source) || /from\(['"]recommendation_outcomes['"]\)\s*\.insert\s*\(/.test(source)) {
  console.error('Recommendation outcome DML boundary regression: FAIL');
  console.error('Outcome persistence must use record_recommendation_outcome RPC.');
  process.exit(1);
}
if (!source.includes("rpc('record_recommendation_outcome'")) {
  console.error('Recommendation outcome DML boundary regression: missing canonical RPC call');
  process.exit(1);
}
console.log('Recommendation outcome DML boundary regression: PASS');
