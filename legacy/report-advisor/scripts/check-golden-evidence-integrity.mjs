import assert from 'node:assert/strict';
const score = (expected, results) => {
  const ids = new Set(expected);
  const valid = new Set();
  for (const r of results) if (ids.has(r.id)) valid.add(r.id);
  const passed = expected.filter(id => results.find(r => r.id === id)?.passed).length;
  return { complete: valid.size === ids.size, passed, total: ids.size };
};
assert.deepEqual(score(['a','b'], [{id:'a',passed:true},{id:'b',passed:true}]), {complete:true,passed:2,total:2});
assert.deepEqual(score(['a','b'], [{id:'a',passed:true},{id:'a',passed:true}]), {complete:false,passed:1,total:2});
assert.deepEqual(score(['a','b'], [{id:'a',passed:true},{id:'b',passed:false}]), {complete:true,passed:1,total:2});
console.log('golden evidence completeness contract: PASS');
