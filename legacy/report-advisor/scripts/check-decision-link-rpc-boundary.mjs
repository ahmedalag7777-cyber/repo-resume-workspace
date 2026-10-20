import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('src/lib/decision-automation/vertical-slice-runtime.ts', 'utf8');
assert.match(source, /rpc\('link_recommendation_to_decision'/, 'decision link must use canonical RPC');
assert.doesNotMatch(source, /from\('recommendations'\)[\s\S]*?\.update\(\{\s*decision_id/, 'recommendation direct lifecycle UPDATE bypass detected');
assert.doesNotMatch(source, /from\('business_intelligence_decisions'\)[\s\S]*?\.update\(\{\s*recommendation_id/, 'decision direct lifecycle UPDATE bypass detected');
console.log('decision link RPC boundary: PASS');
