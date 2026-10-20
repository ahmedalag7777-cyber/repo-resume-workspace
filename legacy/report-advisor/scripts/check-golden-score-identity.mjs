import assert from 'node:assert/strict';
function score(expectedIds, results) {
  const expected = new Set(expectedIds); const seen = new Set(); let passed = 0;
  for (const result of results) { if (!expected.has(result.id) || seen.has(result.id)) continue; seen.add(result.id); if (result.passed) passed++; }
  const cases = expected.size; const accuracy = cases ? passed / cases : 0;
  return { cases, passed, failed: cases - passed, accuracy, ready: seen.size === cases && accuracy >= 0.95 };
}
const ids = ['a', 'b', 'c', 'd'];
assert.equal(score(ids, [{id:'a',passed:true},{id:'b',passed:true},{id:'c',passed:true},{id:'d',passed:true}]).ready, true);
assert.equal(score(ids, [{id:'a',passed:true},{id:'a',passed:true},{id:'b',passed:true},{id:'c',passed:true}]).ready, false);
assert.equal(score(ids, [{id:'a',passed:true},{id:'b',passed:true},{id:'c',passed:true},{id:'d',passed:false}]).ready, false);
assert.equal(score(ids, [{id:'a',passed:true},{id:'b',passed:true},{id:'c',passed:true},{id:'d',passed:true},{id:'x',passed:true}]).ready, true);
console.log('golden score identity contract: PASS');
